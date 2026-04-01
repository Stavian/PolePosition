/// <reference path="../pb_data/types.d.ts" />

/**
 * DrivePack — PocketBase JSVM Hooks
 *
 * Single shared "group" — all users see each other's stats.
 * No group creation/join logic needed.
 *
 * Hooks:
 * - onTripCompleted: update user stats, award badges, append heatmap
 * - weeklyRecap (cron): Monday 07:00 UTC — reset weekly scores for all users
 */

// ─── Trip Completed Hook ──────────────────────────────────────────────────────

onRecordAfterUpdateRequest((e) => {
  const record = e.record;
  if (record.collection().name !== "trips") return;
  if (record.getString("status") !== "completed") return;

  const userId = record.getString("user_id");
  const distanceKm = record.getFloat("distance_km");
  const driveScore = record.getInt("drive_score");

  // Update user lifetime stats
  const user = $app.dao().findRecordById("users", userId);
  user.set("total_trips", user.getInt("total_trips") + 1);
  user.set("total_distance_km", user.getFloat("total_distance_km") + distanceKm);

  // Update weekly stats (running average)
  const prevWeeklyScore = user.getInt("weekly_drive_score");
  const weeklyTrips = user.getInt("weekly_trips") + 1;
  const newWeeklyScore = Math.round(
    (prevWeeklyScore * (weeklyTrips - 1) + driveScore) / weeklyTrips,
  );
  user.set("weekly_drive_score", newWeeklyScore);
  user.set("weekly_trips", weeklyTrips);
  user.set("weekly_distance_km", user.getFloat("weekly_distance_km") + distanceKm);
  $app.dao().saveRecord(user);

  // Evaluate and award badges
  const tripData = {
    topSpeedKmh: record.getFloat("top_speed_kmh"),
    distanceKm,
    durationMinutes: record.getInt("duration_minutes"),
    hardBrakeCount: record.getInt("hard_brake_count"),
    driveScore,
    speedingEventCount: record.getInt("speeding_event_count"),
    startedAt: record.getString("started_at"),
  };

  const recentTrips = $app.dao().findRecordsByFilter(
    "trips",
    `user_id="${userId}" && status="completed"`,
    "-started_at",
    20, 0,
  ).map((t) => ({
    driveScore: t.getInt("drive_score"),
    distanceKm: t.getFloat("distance_km"),
    hardBrakeCount: t.getInt("hard_brake_count"),
    durationMinutes: t.getInt("duration_minutes"),
    startedAtStr: t.getString("started_at"),
  }));

  const badgeIds = JSON.parse(user.getString("badge_ids") || "[]");
  const newBadges = evaluateBadges(tripData, recentTrips, badgeIds);

  if (newBadges.length > 0) {
    const earnedBadgesCol = $app.dao().findCollectionByNameOrId("earned_badges");
    for (const badgeKey of newBadges) {
      const eb = new Record(earnedBadgesCol);
      eb.set("user_id", userId);
      eb.set("badge_key", badgeKey);
      eb.set("triggering_trip_id", record.id);
      $app.dao().saveRecord(eb);
    }
    badgeIds.push(...newBadges);
    user.set("badge_ids", JSON.stringify(badgeIds));
    $app.dao().saveRecord(user);
  }

  // Append downsampled waypoints to the shared heatmap
  if (record.getInt("waypoint_batch_count") > 0) {
    appendToHeatmap(record.id, record.getInt("waypoint_batch_count"));
  }
}, "trips");

// ─── Weekly Recap — every Monday 07:00 UTC ───────────────────────────────────

cronAdd("weeklyReset", "0 7 * * 1", () => {
  // Reset all users' weekly stats at the start of the new week
  const users = $app.dao().findRecordsByFilter("users", "id != ''", "", 0, 0);
  for (const user of users) {
    user.set("weekly_drive_score", 0);
    user.set("weekly_trips", 0);
    user.set("weekly_distance_km", 0);
    $app.dao().saveRecord(user);
  }
});

// ─── Helper Functions ─────────────────────────────────────────────────────────

function evaluateBadges(trip, recentTrips, alreadyEarned) {
  const toAward = [];
  const earned = new Set(alreadyEarned);

  const check = (key, condition) => {
    if (!earned.has(key) && condition) toAward.push(key);
  };

  // Sauberer Fahrer — 10 consecutive trips with score >= 90
  check("clean_driver", recentTrips.length >= 10 && recentTrips.slice(-10).every((t) => t.driveScore >= 90));
  // Tempobolzer — top speed >= 160 km/h with no speeding violations
  check("speed_demon", trip.topSpeedKmh >= 160 && trip.speedingEventCount === 0);
  // Langstreckenfahrer — single trip >= 200 km
  check("marathon", trip.distanceKm >= 200);
  // Samtpfote — no hard braking on a trip >= 30 km
  check("smooth_operator", trip.hardBrakeCount === 0 && trip.distanceKm >= 30);
  // Weitfahrer — trip duration >= 3 hours
  check("road_tripper", trip.durationMinutes >= 180);

  // Nachteule — 5 trips between 23:00–04:00 in last 90 days
  const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).getTime();
  const nightCount = recentTrips.filter((t) => {
    const h = new Date(t.startedAtStr).getHours();
    return (h >= 23 || h < 4) && new Date(t.startedAtStr).getTime() >= cutoff90;
  }).length;
  check("night_owl", nightCount >= 5);

  // Frühaufsteher — 5 trips before 07:00 in last 60 days
  const cutoff60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).getTime();
  const earlyCount = recentTrips.filter((t) => {
    const h = new Date(t.startedAtStr).getHours();
    return h < 7 && new Date(t.startedAtStr).getTime() >= cutoff60;
  }).length;
  check("early_bird", earlyCount >= 5);

  return toAward;
}

/**
 * Append downsampled waypoints to the shared heatmap (one record, group_id="global").
 */
function appendToHeatmap(tripId, batchCount) {
  const MAX_POINTS = 5000;
  const SAMPLE_EVERY = 10;
  const sampledPoints = [];

  for (let i = 0; i < batchCount; i++) {
    try {
      const batch = $app.dao().findFirstRecordByFilter(
        "waypoint_batches",
        `trip_id="${tripId}" && batch_index=${i}`,
      );
      const points = JSON.parse(batch.getString("points") || "[]");
      for (let j = 0; j < points.length; j += SAMPLE_EVERY) {
        sampledPoints.push({ lat: points[j].lat, lng: points[j].lng, weight: 1 });
      }
    } catch { /* batch not found */ }
  }

  if (sampledPoints.length === 0) return;

  try {
    const existing = $app.dao().findFirstRecordByData("heatmap_points", "group_id", "global");
    const existingPoints = JSON.parse(existing.getString("points") || "[]");
    const merged = [...existingPoints, ...sampledPoints].slice(-MAX_POINTS);
    existing.set("points", JSON.stringify(merged));
    $app.dao().saveRecord(existing);
  } catch {
    const col = $app.dao().findCollectionByNameOrId("heatmap_points");
    const rec = new Record(col);
    rec.set("group_id", "global");
    rec.set("points", JSON.stringify(sampledPoints.slice(-MAX_POINTS)));
    $app.dao().saveRecord(rec);
  }
}

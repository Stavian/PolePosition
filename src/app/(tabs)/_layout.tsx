import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';
import { de } from '../../i18n/de';
import { useTripStore } from '../../store/tripStore';

function TabIcon({ label, icon, focused }: { label: string; icon: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const activeTrip = useTripStore((s) => s.activeTrip);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label={de.tabs.home} icon="🏠" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="drive"
        options={{
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon label={de.tabs.drive} icon="🚗" focused={focused || !!activeTrip} />
              {activeTrip && <View style={styles.activeDot} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label={de.tabs.map} icon="🗺" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label={de.tabs.trips} icon="📋" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="group"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label={de.tabs.group} icon="👥" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 70,
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 6,
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textDisabled,
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: colors.accent,
    fontWeight: '700',
  },
  activeDot: {
    position: 'absolute',
    top: 4,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});

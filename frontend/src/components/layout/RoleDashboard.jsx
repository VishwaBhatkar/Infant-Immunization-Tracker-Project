import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { api } from '@/services/apiService';
import { Card, Screen } from '@/components/ui/UI';
import { HealthcareBanner } from '@/components/ui/HealthcareImage';
import { useApp } from '@/context/AppContext';

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Centralized dashboard navigation routes.
| Existing Expo Router paths are preserved.
|
*/

const routes = {
  parentChildren: '/(parent)/children',

  parentAppointments: '/(parent)/appointments',

  parentSchedule: '/(parent)/schedule',

  parentRecords: '/(parent)/immunizations',

  parentGrowth: '/(parent)/growth',

  parentMedical: '/(parent)/medical',

  parentNotifications: '/(parent)/notifications',

  doctorAppointments: '/(doctor)/appointments',

  doctorRecords: '/(doctor)/immunizations',

  hospitalVaccines: '/(hospital-admin)/vaccines',

  hospitalAppointments: '/(hospital-admin)/appointments',

  hospitalDoctors: '/(hospital-admin)/doctors',

  hospitalParents: '/(hospital-admin)/parents',

  hospitalUsers: '/(hospital-admin)/users',

  hospitalChildren: '/(hospital-admin)/children',

  hospitalCompletedVaccinations:
    '/(hospital-admin)/completed-vaccinations',

  hospitalRecords: '/(hospital-admin)/immunizations',

  systemUsers: '/(system-admin)/users',

  systemVaccines: '/(system-admin)/vaccines',

  systemAppointments: '/(system-admin)/appointments',

  systemRecords: '/(system-admin)/immunizations',

  systemDoctors: '/(system-admin)/doctors',

  systemHospitals: '/(system-admin)/hospitals',

  systemChildren: '/(system-admin)/children',

  systemSchedules: '/(system-admin)/schedules',

  hospitalSchedules: '/(hospital-admin)/schedules',

  hospitalProfile: '/(hospital-admin)/profile',
};

/*
|--------------------------------------------------------------------------
| Dashboard Content According to User Role
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Previously PARENT eyebrow contained:
|
|   GOOD MORNING
|
| That was hardcoded.
|
| It has now been replaced with:
|
|   PARENT DASHBOARD
|
| The actual Morning / Afternoon / Evening greeting is generated
| dynamically using getGreeting().
|
*/

const roleCopy = {
  PARENT: {
    eyebrow: 'PARENT DASHBOARD',
    title: 'Stay on track with your child’s health',
    subtitle:
      'Vaccinations, appointments and health records in one trusted place.',
  },

  DOCTOR: {
    eyebrow: 'DOCTOR DASHBOARD',
    title: 'Care for every little patient',
    subtitle:
      'Review today’s visits, patients and administered vaccinations.',
  },

  HOSPITAL_ADMIN: {
    eyebrow: 'HOSPITAL OVERVIEW',
    title: 'We care for little lives',
    subtitle:
      'Manage doctors, appointments, patients and vaccination activity.',
  },

  SYSTEM_ADMIN: {
    eyebrow: 'SYSTEM OVERVIEW',
    title: 'Monitor the complete care network',
    subtitle:
      'View users, hospitals, appointments and immunization activity.',
  },
};

/*
|--------------------------------------------------------------------------
| Dynamic Greeting
|--------------------------------------------------------------------------
|
| This replaces the old hardcoded:
|
|   Good Morning 👋
|
| The greeting is calculated from the device's current local time.
|
| Before 12 PM     -> Good Morning
| 12 PM - 4:59 PM -> Good Afternoon
| 5 PM onwards    -> Good Evening
|
*/

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good Morning 👋';
  }

  if (hour < 17) {
    return 'Good Afternoon 👋';
  }

  return 'Good Evening 👋';
};

/*
|--------------------------------------------------------------------------
| Role Dashboard
|--------------------------------------------------------------------------
*/

export default function RoleDashboard({ role }) {
  /*
  |--------------------------------------------------------------------------
  | Application Context
  |--------------------------------------------------------------------------
  */

  const { theme, user } = useApp();

  /*
  |--------------------------------------------------------------------------
  | Responsive Screen Width
  |--------------------------------------------------------------------------
  */

  const { width } = useWindowDimensions();

  /*
  |--------------------------------------------------------------------------
  | Expo Router
  |--------------------------------------------------------------------------
  */

  const router = useRouter();

  /*
  |--------------------------------------------------------------------------
  | Dashboard State
  |--------------------------------------------------------------------------
  */

  const [data, setData] = useState({});

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [loadMessage, setLoadMessage] = useState('');

  /*
  |--------------------------------------------------------------------------
  | Dashboard Image According to Role
  |--------------------------------------------------------------------------
  */

  const dashboardImage =
    role === 'PARENT'
      ? require('../../../assets/images/dashboard/parent-dashboard.webp')
      : role === 'DOCTOR'
        ? require('../../../assets/images/dashboard/doctor-dashboard.webp')
        : require('../../../assets/images/dashboard/hospital-dashboard.webp');

  /*
  |--------------------------------------------------------------------------
  | Dashboard API Endpoint
  |--------------------------------------------------------------------------
  */

  const endpoint =
    role === 'PARENT'
      ? '/dashboard/parent'
      : role === 'DOCTOR'
        ? '/dashboard/doctor'
        : '/dashboard/admin';

  /*
  |--------------------------------------------------------------------------
  | Dashboard Text
  |--------------------------------------------------------------------------
  */

  const copy = roleCopy[role] || roleCopy.SYSTEM_ADMIN;

  /*
  |--------------------------------------------------------------------------
  | Load Dashboard Data
  |--------------------------------------------------------------------------
  */

  const load = useCallback(
    async (refresh = false) => {
      /*
       * Show either refresh indicator or initial loading indicator.
       */
      refresh ? setRefreshing(true) : setLoading(true);

      /*
       * Remove previous API error message.
       */
      setLoadMessage('');

      try {
        /*
         * Request dashboard information from backend.
         */
        const response = await api.get(endpoint);

        /*
         * Store returned dashboard information.
         */
        setData(response.data.data || {});
      } catch (error) {
        /*
         * Display an understandable error message if dashboard loading fails.
         */
        setLoadMessage(
          error instanceof Error
            ? error.message
            : 'Dashboard data is temporarily unavailable.'
        );
      } finally {
        /*
         * Stop loading indicators.
         */
        setLoading(false);
        setRefreshing(false);
      }
    },
    [endpoint]
  );

  /*
  |--------------------------------------------------------------------------
  | Initial Dashboard Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    void load();
  }, [load]);
    /*
  |--------------------------------------------------------------------------
  | Dashboard Metrics
  |--------------------------------------------------------------------------
  |
  | Metrics change according to the logged-in user's role.
  |
  | The values are NOT hardcoded.
  | They come from the dashboard API response stored in `data`.
  |
  */

  const metrics = useMemo(
    () =>
      role === 'PARENT'
        ? [
            {
              label: 'Children',
              value: data.children,
              icon: 'people-outline',
              route: routes.parentChildren,
            },

            {
              label: 'Upcoming vaccines',
              value: data.upcomingVaccines,
              icon: 'medkit-outline',
              route: `${routes.parentSchedule}?status=UPCOMING`,
            },

            {
              label: 'Overdue vaccines',
              value: data.overdueVaccines,
              icon: 'warning-outline',
              route: `${routes.parentSchedule}?status=OVERDUE`,
            },

            {
              label: 'Appointments',
              value: data.upcomingAppointments,
              icon: 'calendar-outline',
              route: `${routes.parentAppointments}?status=ALL`,
            },

            {
              label: 'Notifications',
              value: data.unreadNotifications,
              icon: 'notifications-outline',
              route: routes.parentNotifications,
            },
          ]
        : role === 'DOCTOR'
          ? [
              {
                label: "Today's appointments",
                value: data.todayAppointments,
                icon: 'calendar-outline',
                route: `${routes.doctorAppointments}?scope=TODAY`,
              },

              {
                label: 'Pending appointments',
                value: data.pendingAppointments,
                icon: 'time-outline',
                route: `${routes.doctorAppointments}?status=PENDING`,
              },

              {
                label: 'Completed visits',
                value: data.completedAppointments,
                icon: 'checkmark-circle-outline',
                route: `${routes.doctorAppointments}?status=COMPLETED`,
              },

              {
                label: 'Assigned patients',
                value: data.assignedPatients,
                icon: 'people-outline',
                route: `${routes.doctorAppointments}?view=PATIENTS`,
              },

              {
                label: 'Vaccines administered',
                value: data.vaccinesAdministered,
                icon: 'medkit-outline',
                route: routes.doctorRecords,
              },
            ]
          : role === 'HOSPITAL_ADMIN'
            ? [
                {
                  label: 'Total users',
                  value: data.totalUsers,
                  icon: 'people-outline',
                  route: routes.hospitalUsers,
                },

                {
                  label: 'Total children',
                  value: data.totalChildren,
                  icon: 'happy-outline',
                  route: routes.hospitalChildren,
                },

                {
                  label: 'Doctors',
                  value: data.totalDoctors,
                  icon: 'medical-outline',
                  route: routes.hospitalDoctors,
                },

                {
                  label: 'Appointments',
                  value: data.totalAppointments,
                  icon: 'calendar-outline',
                  route: routes.hospitalAppointments,
                },

                {
                  label: 'Vaccinations',
                  value: data.vaccinationsCompleted,
                  icon: 'shield-checkmark-outline',
                  route: routes.hospitalCompletedVaccinations,
                },
              ]
            : [
                {
                  label: 'Users',
                  value: data.totalUsers,
                  icon: 'people-outline',
                  route: routes.systemUsers,
                },

                {
                  label: 'Children',
                  value: data.totalChildren,
                  icon: 'happy-outline',
                  route: routes.systemChildren,
                },

                {
                  label: 'Doctors',
                  value: data.totalDoctors,
                  icon: 'medical-outline',
                  route: routes.systemDoctors,
                },

                {
                  label: 'Hospitals',
                  value: data.totalHospitals,
                  icon: 'business-outline',
                  route: routes.systemHospitals,
                },

                {
                  label: 'Appointments',
                  value: data.totalAppointments,
                  icon: 'calendar-outline',
                  route: routes.systemAppointments,
                },

                {
                  label: 'Vaccinations',
                  value: data.vaccinationsCompleted,
                  icon: 'shield-checkmark-outline',
                  route: routes.systemRecords,
                },
              ],
    [data, role]
  );

  /*
  |--------------------------------------------------------------------------
  | Quick Actions
  |--------------------------------------------------------------------------
  |
  | Quick action buttons depend on the current role.
  | Existing navigation paths remain unchanged.
  |
  */

  const actions =
    role === 'PARENT'
      ? [
          {
            label: 'Children',
            route: routes.parentChildren,
            icon: 'people-outline',
          },

          {
            label: 'Vaccinations',
            route: routes.parentSchedule,
            icon: 'medkit-outline',
          },

          {
            label: 'Appointments',
            route: routes.parentAppointments,
            icon: 'calendar-outline',
          },

          {
            label: 'Growth',
            route: routes.parentGrowth,
            icon: 'trending-up-outline',
          },

          {
            label: 'Medical History',
            route: routes.parentMedical,
            icon: 'heart-outline',
          },

          {
            label: 'Records',
            route: routes.parentRecords,
            icon: 'document-text-outline',
          },
        ]
      : role === 'DOCTOR'
        ? [
            {
              label: 'Appointments',
              route: routes.doctorAppointments,
              icon: 'calendar-outline',
            },

            {
              label: 'Immunizations',
              route: routes.doctorRecords,
              icon: 'medkit-outline',
            },
          ]
        : role === 'HOSPITAL_ADMIN'
          ? [
              {
                label: 'Doctors',
                route: routes.hospitalDoctors,
                icon: 'medical-outline',
              },

              {
                label: 'Parents',
                route: routes.hospitalParents,
                icon: 'people-outline',
              },

              {
                label: 'Vaccines',
                route: routes.hospitalVaccines,
                icon: 'medkit-outline',
              },

              {
                label: 'Appointments',
                route: routes.hospitalAppointments,
                icon: 'calendar-outline',
              },

              {
                label: 'Records',
                route: routes.hospitalRecords,
                icon: 'document-text-outline',
              },
            ]
          : [
              {
                label: 'Users',
                route: routes.systemUsers,
                icon: 'people-outline',
              },

              {
                label: 'Doctors',
                route: routes.systemDoctors,
                icon: 'medical-outline',
              },

              {
                label: 'Hospitals',
                route: routes.systemHospitals,
                icon: 'business-outline',
              },

              {
                label: 'Vaccines',
                route: routes.systemVaccines,
                icon: 'medkit-outline',
              },

              {
                label: 'Appointments',
                route: routes.systemAppointments,
                icon: 'calendar-outline',
              },

              {
                label: 'Records',
                route: routes.systemRecords,
                icon: 'document-text-outline',
              },
            ];

  /*
  |--------------------------------------------------------------------------
  | Recent / Upcoming Dashboard Information
  |--------------------------------------------------------------------------
  |
  | Parent:
  |   Upcoming vaccine information
  |
  | Doctor:
  |   Today's appointments
  |
  | Hospital/System Admin:
  |   Recent activity
  |
  */

  const recentItems =
    role === 'PARENT'
      ? data.nextVaccines || []
      : role === 'DOCTOR'
        ? data.today || []
        : data.recentActivity || [];

  /*
  |--------------------------------------------------------------------------
  | Responsive Quick Action Columns
  |--------------------------------------------------------------------------
  |
  | Mobile:
  |   3 columns
  |
  | Tablet:
  |   4 columns
  |
  | Desktop:
  |   6 columns
  |
  */

  const actionColumns =
    width >= 1100
      ? 6
      : width >= 760
        ? 4
        : 3;

  /*
  | Calculate percentage width automatically.
  |
  | Example:
  |
  | 3 columns -> 33.33%
  | 4 columns -> 25%
  | 6 columns -> 16.67%
  */

  const actionWidth = `${100 / actionColumns}%`;

  /*
  |--------------------------------------------------------------------------
  | Responsive Metric Columns
  |--------------------------------------------------------------------------
  |
  | Mobile:
  |   2 columns
  |
  | Tablet:
  |   3 columns
  |
  | Desktop:
  |   5 columns
  |
  */

  const metricColumns =
    width >= 1100
      ? 5
      : width >= 760
        ? 3
        : 2;

  /*
  | Calculate responsive metric-card width.
  */

  const metricWidth = `${100 / metricColumns}%`;

  /*
  |--------------------------------------------------------------------------
  | Initial Loading Screen
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color={theme.primary}
          />

          <Text style={{ color: theme.muted }}>
            Loading dashboard…
          </Text>
        </View>
      </Screen>
    );
  }
    /*
  |--------------------------------------------------------------------------
  | Dashboard UI
  |--------------------------------------------------------------------------
  */

  return (
    <Screen style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={theme.primary}
          />
        }
      >
        {/*
        |--------------------------------------------------------------------------
        | Welcome Header
        |--------------------------------------------------------------------------
        */}

        <View style={styles.welcomeRow}>
          <View style={styles.welcomeText}>
            {/*
             * Logged-in user's first name.
             *
             * Example:
             * Vishwa Raju Bhatkar -> Vishwa
             */}

            <Text
              style={[
                styles.greeting,
                {
                  color: theme.text,
                },
              ]}
            >
              Hello, {user?.name?.split(' ')[0] || 'User'}!
            </Text>

            {/*
             * Dynamic Greeting
             *
             * This is no longer hardcoded.
             *
             * Morning   -> Good Morning
             * Afternoon -> Good Afternoon
             * Evening   -> Good Evening
             */}

            <Text
              style={[
                styles.morning,
                {
                  color: theme.muted,
                },
              ]}
            >
              {getGreeting()}
            </Text>
          </View>

          {/*
          |--------------------------------------------------------------------------
          | Header Action Button
          |--------------------------------------------------------------------------
          |
          | Parent:
          |   Opens Notifications
          |
          | Hospital Admin:
          |   Opens Profile
          |
          | System Admin:
          |   Opens Notifications
          |
          | Doctor:
          |   Opens Profile
          |
          */}

          <Pressable
            onPress={() =>
              router.push(
                role === 'PARENT'
                  ? routes.parentNotifications
                  : role === 'HOSPITAL_ADMIN'
                    ? routes.hospitalProfile
                    : role === 'SYSTEM_ADMIN'
                      ? '/(system-admin)/notifications'
                      : '/(doctor)/profile'
              )
            }
            style={[
              styles.headerIcon,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <Ionicons
              name={
                role === 'PARENT'
                  ? 'notifications-outline'
                  : 'person-outline'
              }
              size={21}
              color={theme.primary}
            />
          </Pressable>
        </View>

        {/*
        |--------------------------------------------------------------------------
        | Responsive Healthcare Banner
        |--------------------------------------------------------------------------
        */}

        <HealthcareBanner
          source={dashboardImage}
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
          accessibilityLabel={`${role.replaceAll(
            '_',
            ' '
          )} healthcare dashboard`}
        />

        {/*
        |--------------------------------------------------------------------------
        | Dashboard API Error Message
        |--------------------------------------------------------------------------
        |
        | If the dashboard API fails, the user can tap this message
        | to retry loading the dashboard data.
        |
        */}

        {loadMessage ? (
          <Pressable
            onPress={() => void load()}
            style={[
              styles.notice,
              {
                backgroundColor: theme.primarySoft,
                borderColor: theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.noticeTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Live totals could not be loaded
            </Text>

            <Text
              style={[
                styles.noticeText,
                {
                  color: theme.muted,
                },
              ]}
            >
              {loadMessage} Tap to retry.
            </Text>
          </Pressable>
        ) : null}

        {/*
        |--------------------------------------------------------------------------
        | Quick Actions Section
        |--------------------------------------------------------------------------
        */}

        <View style={styles.sectionRow}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.text,
              },
            ]}
          >
            Quick Actions
          </Text>
        </View>

        <View style={styles.grid}>
          {actions.map((item) => (
            <View
              key={item.label}
              style={[
                styles.actionWrap,
                {
                  width: actionWidth,
                },
              ]}
            >
              <Pressable
                onPress={() => router.push(item.route)}
                style={({ pressed }) => [
                  styles.actionCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    opacity: pressed ? 0.72 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor: theme.primarySoft,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={theme.primary}
                  />
                </View>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.actionLabel,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/*
        |--------------------------------------------------------------------------
        | Overview / Statistics
        |--------------------------------------------------------------------------
        */}

        <View style={styles.sectionRow}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.text,
              },
            ]}
          >
            Overview
          </Text>
        </View>

        <View style={styles.grid}>
          {metrics.map((item) => (
            <View
              key={item.label}
              style={[
                styles.metricWrap,
                {
                  width: metricWidth,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  if (item.route) {
                    router.push(item.route);
                  }
                }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <Card style={styles.metricCard}>
                  <View
                    style={[
                      styles.metricIcon,
                      {
                        backgroundColor: theme.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={21}
                      color={theme.primary}
                    />
                  </View>

                  <Text
                    style={[
                      styles.metricValue,
                      {
                        color: theme.primary,
                      },
                    ]}
                  >
                    {Number(item.value || 0)}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={[
                      styles.metricLabel,
                      {
                        color: theme.muted,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Card>
              </Pressable>
            </View>
          ))}
        </View>

        {/*
        |--------------------------------------------------------------------------
        | Recent / Upcoming Section
        |--------------------------------------------------------------------------
        */}

        <View style={styles.sectionRow}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.text,
              },
            ]}
          >
            {role === 'PARENT'
              ? 'Upcoming'
              : role === 'DOCTOR'
                ? "Today's Schedule"
                : 'Recent Activity'}
          </Text>
        </View>

        {/*
        |--------------------------------------------------------------------------
        | Empty State
        |--------------------------------------------------------------------------
        */}

        {recentItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor: theme.successSoft,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={26}
                color={theme.success}
              />
            </View>

            <View style={styles.emptyText}>
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Nothing needs attention
              </Text>

              <Text
                style={{
                  color: theme.muted,
                }}
              >
                New activity will appear here automatically.
              </Text>
            </View>
          </Card>
        ) : (
          /*
          |--------------------------------------------------------------------------
          | Recent Activity Items
          |--------------------------------------------------------------------------
          */

          recentItems.map((item, index) => (
            <Card
              key={String(item.id ?? index)}
              style={styles.activityCard}
            >
              <View
                style={[
                  styles.activityIcon,
                  {
                    backgroundColor: theme.primarySoft,
                  },
                ]}
              >
                <Ionicons
                  name={
                    role === 'DOCTOR'
                      ? 'calendar-outline'
                      : 'medkit-outline'
                  }
                  size={22}
                  color={theme.primary}
                />
              </View>

              <View style={styles.activityText}>
                <Text
                  style={[
                    styles.itemTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {item.vaccine_name
                    ? `${item.vaccine_name} · Dose ${item.dose_number}`
                    : item.child_name ||
                      item.title ||
                      'Activity'}
                </Text>

                <Text
                  style={{
                    color: theme.muted,
                  }}
                >
                  {item.status || item.message || ''}
                </Text>

                <Text
                  style={[
                    styles.itemDate,
                    {
                      color: theme.primary,
                    },
                  ]}
                >
                  {item.due_date ||
                    item.appointment_date ||
                    ''}{' '}
                  {item.appointment_time || ''}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.muted}
              />
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
const styles = StyleSheet.create({
  /*
  |--------------------------------------------------------------------------
  | Main Screen
  |--------------------------------------------------------------------------
  */

  screen: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
  },

  /*
  |--------------------------------------------------------------------------
  | ScrollView
  |--------------------------------------------------------------------------
  */

  scroll: {
    flex: 1,
    width: '100%',

    /*
     * Web needs vertical scrolling when content is larger than viewport.
     */
    ...(Platform.OS === 'web'
      ? {
          overflowY: 'auto',
        }
      : {}),
  },

  /*
  |--------------------------------------------------------------------------
  | Main Content Container
  |--------------------------------------------------------------------------
  |
  | width: 100%
  |   Keeps the layout responsive.
  |
  | maxWidth: 1280
  |   Prevents content from becoming too wide on desktop/web.
  |
  | alignSelf: center
  |   Centers the dashboard on large screens.
  |
  */

  content: {
    width: '100%',
    maxWidth: 1280,
    alignSelf: 'center',

    paddingTop: 14,

    /*
     * Extra bottom padding prevents content from being hidden
     * behind the bottom navigation/tab bar.
     */
    paddingBottom: Platform.OS === 'web' ? 100 : 130,
  },

  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  /*
  |--------------------------------------------------------------------------
  | Welcome Header
  |--------------------------------------------------------------------------
  */

  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 14,
  },

  welcomeText: {
    flex: 1,
    minWidth: 0,
  },

  /*
   * "Hello, Vishwa!"
   */
  greeting: {
    fontSize: 23,
    fontWeight: '900',
  },

  /*
   * Dynamic greeting:
   *
   * Good Morning
   * Good Afternoon
   * Good Evening
   */
  morning: {
    marginTop: 2,
    fontSize: 13,
  },

  /*
  |--------------------------------------------------------------------------
  | Header Icon
  |--------------------------------------------------------------------------
  */

  headerIcon: {
    width: 44,
    height: 44,

    borderRadius: 14,
    borderWidth: 1,

    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
  |--------------------------------------------------------------------------
  | API Error / Retry Notice
  |--------------------------------------------------------------------------
  */

  notice: {
    borderWidth: 1,
    borderRadius: 16,

    padding: 14,

    marginBottom: 16,
  },

  noticeTitle: {
    fontWeight: '800',
    marginBottom: 3,
  },

  noticeText: {
    lineHeight: 19,
  },

  /*
  |--------------------------------------------------------------------------
  | Section Headers
  |--------------------------------------------------------------------------
  */

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginTop: 3,
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
  },

  /*
  |--------------------------------------------------------------------------
  | Responsive Grid
  |--------------------------------------------------------------------------
  |
  | flexWrap allows cards to automatically move to the next row.
  |
  | The individual card width is calculated dynamically using:
  |
  | actionWidth
  | metricWidth
  |
  */

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    /*
     * Negative margin balances the padding applied
     * to each child wrapper.
     */
    marginHorizontal: -5,

    marginBottom: 12,
  },

  /*
  |--------------------------------------------------------------------------
  | Quick Action Wrapper
  |--------------------------------------------------------------------------
  */

  actionWrap: {
    padding: 5,

    /*
     * Important for responsive layouts.
     * Prevents child content from forcing horizontal overflow.
     */
    minWidth: 0,
  },

  /*
  |--------------------------------------------------------------------------
  | Quick Action Card
  |--------------------------------------------------------------------------
  */

  actionCard: {
    minHeight: 92,

    borderWidth: 1,
    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    padding: 10,
  },

  /*
  |--------------------------------------------------------------------------
  | Quick Action Icon
  |--------------------------------------------------------------------------
  */

  actionIcon: {
    width: 44,
    height: 44,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 7,
  },

  actionLabel: {
    textAlign: 'center',

    fontSize: 12,
    fontWeight: '700',
  },

  /*
  |--------------------------------------------------------------------------
  | Metric Card Wrapper
  |--------------------------------------------------------------------------
  */

  metricWrap: {
    padding: 5,
    minWidth: 0,
  },

  /*
  |--------------------------------------------------------------------------
  | Metric Card
  |--------------------------------------------------------------------------
  */

  metricCard: {
    minHeight: 132,

    alignItems: 'center',
    justifyContent: 'center',

    padding: 13,
  },

  /*
  |--------------------------------------------------------------------------
  | Metric Icon
  |--------------------------------------------------------------------------
  */

  metricIcon: {
    width: 40,
    height: 40,

    borderRadius: 13,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 8,
  },

  /*
  |--------------------------------------------------------------------------
  | Metric Number
  |--------------------------------------------------------------------------
  |
  | Example:
  |
  | Children
  |    3
  |
  */

  metricValue: {
    fontSize: 27,
    fontWeight: '900',
  },

  /*
  |--------------------------------------------------------------------------
  | Metric Label
  |--------------------------------------------------------------------------
  */

  metricLabel: {
    textAlign: 'center',

    fontSize: 12,
    fontWeight: '600',

    marginTop: 3,
  },

  /*
  |--------------------------------------------------------------------------
  | Empty State
  |--------------------------------------------------------------------------
  */

  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',

    padding: 14,
  },

  emptyIcon: {
    width: 46,
    height: 46,

    borderRadius: 15,

    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    flex: 1,
    minWidth: 0,

    marginLeft: 12,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',

    marginBottom: 3,
  },

  /*
  |--------------------------------------------------------------------------
  | Recent Activity Card
  |--------------------------------------------------------------------------
  */

  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',

    padding: 14,
  },

  /*
  |--------------------------------------------------------------------------
  | Recent Activity Icon
  |--------------------------------------------------------------------------
  */

  activityIcon: {
    width: 46,
    height: 46,

    borderRadius: 15,

    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
  |--------------------------------------------------------------------------
  | Recent Activity Text
  |--------------------------------------------------------------------------
  */

  activityText: {
    flex: 1,

    /*
     * Prevents long vaccine/child names from creating
     * horizontal overflow.
     */
    minWidth: 0,

    marginHorizontal: 12,
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: '800',

    marginBottom: 4,
  },

  itemDate: {
    marginTop: 5,

    fontWeight: '700',
    fontSize: 12,
  },
});
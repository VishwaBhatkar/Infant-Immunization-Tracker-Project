/**
 * File: frontend/src/app/(hospital-admin)/completed-vaccinations.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import ImmunizationRecords from '@/screens/ImmunizationRecordsScreen';

export default function CompletedVaccinations() {
  return <ImmunizationRecords title="Completed Vaccinations" subtitle="Only completed vaccination records for your hospital." canManage={false}/>;
}

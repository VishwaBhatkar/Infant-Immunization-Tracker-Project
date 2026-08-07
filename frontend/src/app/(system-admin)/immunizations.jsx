/**
 * File: frontend/src/app/(system-admin)/immunizations.jsx
 * Purpose: Defines an Expo Router screen, layout, or route entry for the mobile/web application.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import ImmunizationRecords from '@/screens/ImmunizationRecordsScreen';
export default function SystemImmunizations() { return <ImmunizationRecords canManage/>; }

/**
 * File: frontend/src/screens/VaccineManagementScreen.jsx
 * Purpose: Defines a feature screen and coordinates its UI state, validation, and API interactions.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import React, {
    useCallback,
    useEffect,
    useState
} from 'react';

import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { api } from '@/services/apiService';
import {
    Btn,
    Card,
    Input,
    Screen,
    showError
} from '@/components/ui/UI';

import { useApp } from '@/context/AppContext';
import { showToast } from '@/components/ui/Feedback';

/**
 * Default values used by the add/edit vaccine form.
 *
 * All input values are stored as strings because React Native
 * TextInput components work with string values.
 */
const emptyForm = {
    name: '',
    description: '',
    disease_prevented: '',
    recommended_age_days: '',
    dose_number: '1',
    gap_between_doses_days: '',
    administration_route: 'INTRAMUSCULAR'
};

/**
 * Vaccine Management Screen
 *
 * This screen allows an administrator to:
 * 1. View all vaccines
 * 2. Search vaccines
 * 3. Filter active and inactive vaccines
 * 4. Add a new vaccine
 * 5. Update an existing vaccine
 * 6. Activate or deactivate a vaccine
 * 7. Delete an unused vaccine
 */
export default function VaccineManagementScreen() {

    // Get the currently selected application theme.
    const { theme } = useApp();

    // Stores the list of vaccines received from the backend.
    const [items, setItems] = useState([]);

    // Stores the current add/edit form values.
    const [form, setForm] = useState(emptyForm);

    // Stores the vaccine ID currently being edited.
    // A null value means the form is in "Add Vaccine" mode.
    const [editingId, setEditingId] = useState(null);

    // Search text used to filter vaccines by name or disease.
    const [search, setSearch] = useState('');

    // Vaccine status filter: ALL, ACTIVE, or INACTIVE.
    const [status, setStatus] = useState('ALL');

    // Indicates whether the initial vaccine list is loading.
    const [loading, setLoading] = useState(false);

    // Indicates whether pull-to-refresh is active.
    const [refreshing, setRefreshing] = useState(false);

    // Prevents duplicate form submissions.
    const [submitting, setSubmitting] = useState(false);

    /**
     * Load vaccines from the backend.
     *
     * The function is recreated only when the search text
     * or selected status changes.
     *
     * @param {boolean} showRefresh
     * Determines whether to display the pull-to-refresh loader
     * or the normal loading message.
     */
    const load = useCallback(async (showRefresh = false) => {

        // Display the correct loading indicator.
        if (showRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {

            // Request vaccines using search and status filters.
            const response = await api.get('/vaccines', {
                params: {
                    search,
                    status,
                    limit: 100
                }
            });

            // Store the received vaccine list.
            setItems(response.data.data.items);

        } catch (error) {

            // Display a common API error message.
            showError(error);

        } finally {

            // Stop both loading indicators.
            setLoading(false);
            setRefreshing(false);
        }

    }, [search, status]);

    /**
     * Load vaccines when the screen opens.
     *
     * The list is also reloaded automatically whenever
     * the search text or status filter changes.
     */
    useEffect(() => {
        void load();
    }, [load]);

    /**
     * Update one property in the vaccine form.
     *
     * @param {string} field Form property name
     * @param {string} value New field value
     */
    const setField = (field, value) => {

        setForm((current) => ({
            ...current,
            [field]: value
        }));
    };

    /**
     * Reset the form and return to Add Vaccine mode.
     */
    const reset = () => {
        setForm(emptyForm);
        setEditingId(null);
    };

    /**
     * Create or update a vaccine.
     *
     * If editingId exists, the function updates an existing
     * vaccine. Otherwise, it creates a new vaccine.
     */
    const submit = async () => {

        // Prevent multiple submissions while a request is running.
        if (submitting) {
            return;
        }

        setSubmitting(true);

        /**
         * Convert form strings into the data types expected
         * by the backend.
         */
        const payload = {
            name: form.name.trim(),

            // Optional empty values are sent as null.
            description:
                form.description.trim() || null,

            disease_prevented:
                form.disease_prevented.trim() || null,

            // Numeric fields are converted from strings to numbers.
            recommended_age_days:
                Number(form.recommended_age_days),

            dose_number:
                Number(form.dose_number),

            gap_between_doses_days:
                form.gap_between_doses_days
                    ? Number(form.gap_between_doses_days)
                    : null,

            administration_route:
                form.administration_route
        };

        try {

            if (editingId) {

                // Update an existing vaccine.
                await api.patch(
                    `/vaccines/${editingId}`,
                    payload
                );

            } else {

                // Create a new vaccine.
                await api.post(
                    '/vaccines',
                    payload
                );
            }

            // Save the current mode before reset clears editingId.
            const wasEditing = Boolean(editingId);

            // Reset the form after successful submission.
            reset();

            // Reload the vaccine list.
            await load();

            // Show a success message.
            showToast(
                wasEditing
                    ? 'Vaccine updated successfully'
                    : 'Vaccine created successfully'
            );

        } catch (error) {

            showError(error);

        } finally {

            setSubmitting(false);
        }
    };

    /**
     * Fill the form with an existing vaccine's information.
     *
     * This changes the form from Add mode to Edit mode.
     *
     * @param {object} item Selected vaccine
     */
    const edit = (item) => {

        // Store the selected vaccine ID.
        setEditingId(item.id);

        // Convert numeric and nullable values to input strings.
        setForm({
            name: item.name,

            description:
                item.description || '',

            disease_prevented:
                item.disease_prevented || '',

            recommended_age_days:
                String(item.recommended_age_days),

            dose_number:
                String(item.dose_number),

            gap_between_doses_days:
                item.gap_between_doses_days == null
                    ? ''
                    : String(item.gap_between_doses_days),

            administration_route:
                item.administration_route ||
                'INTRAMUSCULAR'
        });
    };

    /**
     * Activate or deactivate a vaccine.
     *
     * The backend toggles the current vaccine status.
     *
     * @param {object} item Selected vaccine
     */
    const toggle = async (item) => {

        try {

            await api.patch(
                `/vaccines/${item.id}/status`
            );

            // Refresh the list after changing the status.
            await load();

            showToast(
                item.is_active
                    ? 'Vaccine deactivated successfully'
                    : 'Vaccine activated successfully'
            );

        } catch (error) {

            showError(error);
        }
    };

    /**
     * Display a confirmation dialog before deleting a vaccine.
     *
     * The backend should allow deletion only when the vaccine
     * is not being used in schedules or immunization records.
     *
     * @param {object} item Selected vaccine
     */
    const remove = (item) => {

        Alert.alert(
            'Delete vaccine?',
            `${item.name} dose ${item.dose_number} will be permanently deleted only if it is unused.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',

                    onPress: async () => {

                        try {

                            await api.delete(
                                `/vaccines/${item.id}`
                            );

                            // Reload the list after deletion.
                            await load();

                            showToast(
                                'Vaccine deleted successfully'
                            );

                        } catch (error) {

                            showError(error);
                        }
                    }
                }
            ]
        );
    };

    /**
     * Reusable filter chip component.
     *
     * @param {object} props
     * @param {string} props.value Filter value
     */
    const Filter = ({ value }) => (

        <Pressable
            onPress={() => setStatus(value)}
            style={[
                styles.chip,
                {
                    borderColor: theme.border,

                    backgroundColor:
                        status === value
                            ? theme.primary
                            : theme.card
                }
            ]}
        >
            <Text
                style={{
                    color:
                        status === value
                            ? 'white'
                            : theme.text
                }}
            >
                {value}
            </Text>
        </Pressable>
    );

    return (

        <Screen>

            <FlatList

                // Vaccine data displayed by the list.
                data={items}

                // Unique key for each vaccine item.
                keyExtractor={(item) =>
                    String(item.id)
                }

                // Pull-to-refresh configuration.
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => void load(true)}
                    />
                }

                /**
                 * Content displayed above the vaccine list.
                 *
                 * Includes:
                 * - Screen title
                 * - Add/Edit form
                 * - Search field
                 * - Status filters
                 * - Loading and empty messages
                 */
                ListHeaderComponent={
                    <>

                        <Text
                            style={[
                                styles.title,
                                { color: theme.text }
                            ]}
                        >
                            Vaccine Management
                        </Text>

                        {/* Add or Edit Vaccine Form */}
                        <Card>

                            <Text
                                style={[
                                    styles.heading,
                                    { color: theme.text }
                                ]}
                            >
                                {editingId
                                    ? 'Edit vaccine'
                                    : 'Add vaccine'}
                            </Text>

                            <Input
                                placeholder="Vaccine name"
                                value={form.name}
                                onChangeText={(value) =>
                                    setField('name', value)
                                }
                            />

                            <Input
                                placeholder="Disease prevented"
                                value={form.disease_prevented}
                                onChangeText={(value) =>
                                    setField(
                                        'disease_prevented',
                                        value
                                    )
                                }
                            />

                            <Input
                                placeholder="Description"
                                value={form.description}
                                onChangeText={(value) =>
                                    setField(
                                        'description',
                                        value
                                    )
                                }
                                multiline
                            />

                            <Input
                                placeholder="Recommended age in days"
                                value={form.recommended_age_days}
                                onChangeText={(value) =>
                                    setField(
                                        'recommended_age_days',
                                        value
                                    )
                                }
                                keyboardType="numeric"
                            />

                            <Input
                                placeholder="Dose number"
                                value={form.dose_number}
                                onChangeText={(value) =>
                                    setField(
                                        'dose_number',
                                        value
                                    )
                                }
                                keyboardType="numeric"
                            />

                            <Input
                                placeholder="Gap between doses in days"
                                value={form.gap_between_doses_days}
                                onChangeText={(value) =>
                                    setField(
                                        'gap_between_doses_days',
                                        value
                                    )
                                }
                                keyboardType="numeric"
                            />

                            <Text
                                style={{
                                    color: theme.muted,
                                    marginBottom: 8
                                }}
                            >
                                Administration route
                            </Text>

                            {/* Administration Route Selection */}
                            <View style={styles.row}>

                                {[
                                    'ORAL',
                                    'INTRAMUSCULAR',
                                    'SUBCUTANEOUS',
                                    'INTRADERMAL',
                                    'OTHER'
                                ].map((route) => (

                                    <Pressable
                                        key={route}
                                        onPress={() =>
                                            setField(
                                                'administration_route',
                                                route
                                            )
                                        }
                                        style={[
                                            styles.chip,
                                            {
                                                borderColor:
                                                    theme.border,

                                                backgroundColor:
                                                    form.administration_route ===
                                                    route
                                                        ? theme.primary
                                                        : theme.card
                                            }
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color:
                                                    form.administration_route ===
                                                    route
                                                        ? 'white'
                                                        : theme.text,

                                                fontSize: 12
                                            }}
                                        >
                                            {route}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            {/* Create or Update Button */}
                            <Btn
                                title={
                                    editingId
                                        ? 'Update Vaccine'
                                        : 'Add Vaccine'
                                }
                                onPress={() => void submit()}
                                loading={submitting}
                            />

                            {/* Cancel button is displayed only during editing */}
                            {editingId ? (
                                <Btn
                                    title="Cancel Editing"
                                    onPress={reset}
                                />
                            ) : null}

                        </Card>

                        {/* Search Input */}
                        <Input
                            placeholder="Search vaccine or disease"
                            value={search}
                            onChangeText={setSearch}
                        />

                        {/* Status Filters */}
                        <View style={styles.row}>
                            <Filter value="ALL" />
                            <Filter value="ACTIVE" />
                            <Filter value="INACTIVE" />
                        </View>

                        {/* Loading Message */}
                        {loading ? (
                            <Text
                                style={{
                                    color: theme.muted,
                                    marginVertical: 12
                                }}
                            >
                                Loading vaccines…
                            </Text>
                        ) : null}

                        {/* Empty List Message */}
                        {!loading && !items.length ? (
                            <Text
                                style={{
                                    color: theme.muted,
                                    marginVertical: 12
                                }}
                            >
                                No vaccines found.
                            </Text>
                        ) : null}

                    </>
                }

                /**
                 * Render each vaccine card.
                 */
                renderItem={({ item }) => (

                    <Card>

                        {/* Vaccine Name and Status */}
                        <View style={styles.between}>

                            <Text
                                style={[
                                    styles.heading,
                                    { color: theme.text }
                                ]}
                            >
                                {item.name} · Dose {item.dose_number}
                            </Text>

                            <Text
                                style={{
                                    color: item.is_active
                                        ? '#15803d'
                                        : '#b91c1c',

                                    fontWeight: '700'
                                }}
                            >
                                {item.is_active
                                    ? 'ACTIVE'
                                    : 'INACTIVE'}
                            </Text>

                        </View>

                        {/* Vaccine Details */}
                        <Text style={{ color: theme.text }}>
                            Disease:{' '}
                            {item.disease_prevented ||
                                'Not specified'}
                        </Text>

                        <Text style={{ color: theme.text }}>
                            Recommended age:{' '}
                            {item.recommended_age_days} days
                        </Text>

                        <Text style={{ color: theme.text }}>
                            Dose gap:{' '}
                            {item.gap_between_doses_days ??
                                'Not specified'}{' '}
                            days
                        </Text>

                        <Text style={{ color: theme.text }}>
                            Route:{' '}
                            {item.administration_route ||
                                'Not specified'}
                        </Text>

                        {/* Display description only when available */}
                        {item.description ? (
                            <Text
                                style={{
                                    color: theme.muted,
                                    marginTop: 6
                                }}
                            >
                                {item.description}
                            </Text>
                        ) : null}

                        {/* Vaccine Actions */}
                        <View style={styles.actions}>

                            <Pressable
                                onPress={() => edit(item)}
                            >
                                <Text
                                    style={{
                                        color: theme.primary,
                                        fontWeight: '700'
                                    }}
                                >
                                    Edit
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() =>
                                    void toggle(item)
                                }
                            >
                                <Text
                                    style={{
                                        color: theme.primary,
                                        fontWeight: '700'
                                    }}
                                >
                                    {item.is_active
                                        ? 'Deactivate'
                                        : 'Activate'}
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => remove(item)}
                            >
                                <Text
                                    style={{
                                        color: '#b91c1c',
                                        fontWeight: '700'
                                    }}
                                >
                                    Delete
                                </Text>
                            </Pressable>

                        </View>

                    </Card>
                )}
            />

        </Screen>
    );
}

/**
 * Styles used by the Vaccine Management screen.
 */
const styles = StyleSheet.create({

    // Main page title.
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 12
    },

    // Card and form heading.
    heading: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 10
    },

    // Responsive horizontal layout used for chips.
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12
    },

    // Style for filter and administration-route buttons.
    chip: {
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 8
    },

    // Places vaccine title and status on opposite sides.
    between: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },

    // Places action buttons evenly in one row.
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16
    }
});
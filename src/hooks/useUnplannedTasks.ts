import { useState, useEffect } from 'react';
import type { AssignmentModel, AssignmentStore, EventColor, EventStore, Model, SchedulerPro } from '@bryntum/schedulerpro';
import type { Appointment } from '../lib/Appointment';

interface UnplannedTask {
  id: string | number;
  name: string;
  iconCls: string;
  patient: string;
  confirmed: boolean;
  duration: number;
  eventColor: EventColor;
  requiredRole: string;
  durationUnit: string;
}

interface UseUnplannedTasksResult {
  tasks: UnplannedTask[];
  loading: boolean;
  error: string | null;
}

export const useUnplannedTasks = (scheduler?: SchedulerPro): UseUnplannedTasksResult => {
    const [tasks, setTasks] = useState<UnplannedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper function to format events from the store
    const formatUnplannedEvents = (eventStore: EventStore, assignmentStore: AssignmentStore) => {
        if (!eventStore || !assignmentStore) return [];

        const unplannedEvents = eventStore.records.filter((event: Model) => {
            // Check if event has any assignments
            const hasAssignments = (assignmentStore.records as AssignmentModel[]).some((assignment) =>
                assignment.eventId === event.id || assignment.event === event.id
            );
            return !hasAssignments;
        });

        return (unplannedEvents as Appointment[]).map((event) => ({
            id           : event.id,
            name         : event.name,
            iconCls      : event.iconCls?.replace('b-fa b-fa-', '') || event.iconCls?.replace('b-icon b-fa-', '') || 'stethoscope',
            patient      : event.patient || '',
            confirmed    : event.confirmed,
            duration     : event.duration || 1,
            eventColor   : event.eventColor,
            requiredRole : event.requiredRole || 'Other',
            durationUnit : event.durationUnit || 'h'
        })).sort((a, b) => a.requiredRole.localeCompare(b.requiredRole));
    };

    // Listen for scheduler project data changes
    useEffect(() => {
        if (!scheduler?.project) {
            setLoading(true);
            return;
        }

        const updateTasks = () => {
            try {
                const formattedTasks = formatUnplannedEvents(
                    scheduler.project.eventStore,
                    scheduler.project.assignmentStore
                );
                setTasks(formattedTasks);
                setError(null);
                setLoading(false);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to update tasks');
                setLoading(false);
            }
        };

        // Initial load when project is ready
        if (scheduler.project.eventStore && scheduler.project.assignmentStore) {
            updateTasks();
        }

        // Listen to store changes for automatic updates
        const eventStoreListeners = {
            add    : updateTasks,
            remove : updateTasks,
            update : updateTasks,
            change : updateTasks
        };

        const assignmentStoreListeners = {
            add    : updateTasks,
            remove : updateTasks,
            change : updateTasks
        };

        // Add listeners
        Object.entries(eventStoreListeners).forEach(([event, handler]) => {
            scheduler.project.eventStore.on(event, handler);
        });

        Object.entries(assignmentStoreListeners).forEach(([event, handler]) => {
            scheduler.project.assignmentStore.on(event, handler);
        });

        // Listen for project load completion
        scheduler.project.on('load', updateTasks);

        // Cleanup listeners
        return () => {
            Object.entries(eventStoreListeners).forEach(([event, handler]) => {
                scheduler.project.eventStore.un(event, handler);
            });

            Object.entries(assignmentStoreListeners).forEach(([event, handler]) => {
                scheduler.project.assignmentStore.un(event, handler);
            });

            scheduler.project.un('load', updateTasks);
        };
    }, [scheduler]);

    return { tasks, loading, error };
};
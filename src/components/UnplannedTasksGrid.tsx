import { useRef, useCallback, forwardRef, useImperativeHandle, useEffect
} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { type ColDef, type GetRowIdParams, type SelectionChangedEvent, type GridReadyEvent, type GridApi
} from 'ag-grid-community';
import type { SchedulerPro } from '@bryntum/schedulerpro';
import type { Appointment } from '../lib/Appointment';
import { useUnplannedTasks } from '../hooks/useUnplannedTasks';
import { AppointmentDragHelper } from '../utils/appointmentDragHelper';

interface UnplannedTasksGridProps {
  scheduler?: SchedulerPro;
  onSelectionChange?: (selectedRecords: Appointment[]) => void;
}

export interface UnplannedTasksGridRef {
  getSelectedRecords: () => Appointment[];
  addTask: (newTask: Partial<Appointment>) => void;
  deleteTask: (eventId: number) => void;
  updateTask: (eventId: number, updates: Partial<Appointment>) => void;
}

export const UnplannedTasksGrid = forwardRef<UnplannedTasksGridRef, UnplannedTasksGridProps>(
    ({ scheduler, onSelectionChange }, ref) => {

        const gridRef = useRef<AgGridReact>(null);
        const gridApiRef = useRef<GridApi | null>(null);
        const dragHelperRef = useRef<AppointmentDragHelper | null>(null);

        const { tasks, loading, error } = useUnplannedTasks(scheduler);

        useImperativeHandle(ref, () => ({
            getSelectedRecords : () => {
                const selectedNodes = gridApiRef.current?.getSelectedNodes() || [];
                return selectedNodes.map(node => node.data).filter(Boolean);
            },
            addTask    : handleAddEvent,
            deleteTask : handleDeleteEvent,
            updateTask : handleUpdateEvent
        }));

        // Update Bryntum project store when tasks are edited - this will auto-sync to backend
        const handleUpdateEvent = useCallback((eventId: number, updates: Partial<Appointment>) => {
            if (!scheduler?.project?.eventStore) return;

            const event = scheduler.project.eventStore.getById(eventId);
            if (event) {
                // Apply updates to the Bryntum event record
                // This will trigger auto-sync due to autoSync: true in project config
                Object.assign(event, updates);
            }
        }, [scheduler]);

        // Add new task to Bryntum event store - will auto-sync to backend
        const handleAddEvent = useCallback((newTask: Partial<Appointment>) => {
            if (!scheduler?.project?.eventStore) return;

            const taskData = {
                name         : newTask.name || 'New Appointment',
                patient      : newTask.patient || '',
                duration     : newTask.duration || 1,
                durationUnit : 'h',
                requiredRole : newTask.requiredRole || 'Other',
                iconCls      : 'b-fa b-fa-stethoscope',
                eventColor   : 'blue',
                confirmed    : false,
                ...newTask
            };

            // Add to event store - will trigger auto-sync
            scheduler.project.eventStore.add(taskData);
        }, [scheduler]);

        // Delete task from Bryntum event store - will auto-sync to backend
        const handleDeleteEvent = useCallback((eventId: number) => {
            if (!scheduler?.project?.eventStore) return;

            const event = scheduler.project.eventStore.getById(eventId);
            if (event) {
                // Remove from event store - will trigger auto-sync
                scheduler.project.eventStore.remove(event);
            }
        }, [scheduler]);

        const initializeDragHelper = useCallback(() => {
            if (!scheduler || !gridApiRef.current) return;

            const gridElement = document.querySelector('.ag-grid-container') as HTMLElement;
            if (!gridElement) return;

            dragHelperRef.current?.destroy();
            dragHelperRef.current = new AppointmentDragHelper({
                scheduler,
                gridApi      : gridApiRef.current,
                outerElement : gridElement
            });
        }, [scheduler]);

        // Set up drag helper when scheduler changes (if grid is already ready)
        useEffect(() => {
            initializeDragHelper();
            return () => dragHelperRef.current?.destroy();
        }, [initializeDragHelper]);

        const columnDefs: ColDef<Appointment>[] = [
            {
                headerName         : 'Appointment',
                field              : 'name',
                flex               : 1,
                editable           : true,
                cellClass          : 'unscheduledNameCell',
                onCellValueChanged : (params) => {
                    handleUpdateEvent(params.data.id, { name : params.newValue });
                },
                cellRenderer : ({ data }: { data: Appointment }) => (
                    <div style={{ display : 'flex', alignItems : 'center', padding : '8px 0' }}>
                        <i className={`b-fa b-fa-${data.iconCls}`} style={{ marginRight : '8px' }} />
                        <div>
                            <div>{data.name}</div>
                            <div style={{ fontSize : '12px', color : '#666' }}>Patient: {data.patient}</div>
                        </div>
                    </div>
                )
            },
            {
                headerName         : 'Patient',
                field              : 'patient',
                width              : 120,
                editable           : true,
                onCellValueChanged : (params) => {
                    handleUpdateEvent(params.data.id, { patient : params.newValue });
                }
            },
            {
                headerName       : 'Required role',
                field            : 'requiredRole',
                width            : 140,
                editable         : true,
                cellEditor       : 'agSelectCellEditor',
                cellEditorParams : {
                    values : ['Doctor', 'Nurse', 'Radiation oncology nurse']
                },
                onCellValueChanged : (params) => {
                    handleUpdateEvent(params.data.id, { requiredRole : params.newValue });
                },
                rowGroup : true,
                hide     : false
            },
            {
                headerName       : 'Duration',
                field            : 'duration',
                width            : 110,
                editable         : true,
                cellEditor       : 'agNumberCellEditor',
                cellEditorParams : { min : 0.5, max : 24, step : 0.5 },
                valueParser      : (params) => {
                    const newValue = parseFloat(params.newValue);
                    return isNaN(newValue) ? params.oldValue : newValue;
                },
                onCellValueChanged : (params) => {
                    handleUpdateEvent(params.data.id, { duration : params.newValue });
                },
                cellRenderer : ({ data }: { data: Appointment }) => (
                    <div style={{ textAlign : 'center', padding : '8px' }}>
                        <i className="b-icon b-fa-clock" style={{ marginRight : '4px' }} />
                        {data.duration} {data.durationUnit}
                    </div>
                )
            }
        ];

        const defaultColDef: ColDef = {
            sortable  : true,
            filter    : true,
            resizable : true
        };

        const getRowId = useCallback((params: GetRowIdParams<Appointment>) => {
            return params.data.id.toString();
        }, []);

        const handleSelectionChanged = useCallback((event: SelectionChangedEvent<Appointment>) => {
            const selectedNodes = event.api.getSelectedNodes();
            const selectedRecords = selectedNodes.map(node => node.data).filter(Boolean);
            onSelectionChange?.(selectedRecords);
        }, [onSelectionChange]);

        const handleGridReady = useCallback((event: GridReadyEvent<Appointment>) => {
            gridApiRef.current = event.api;
            initializeDragHelper();
        }, [initializeDragHelper]);

        if (loading) return <div>Loading tasks...</div>;
        if (error) return <div>Error: {error}</div>;

        return (
            <div style={{ width : '100%', height : '100%' }} className="ag-grid-container">
                <AgGridReact
                    ref={gridRef}
                    rowData={tasks}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    getRowId={getRowId}
                    onSelectionChanged={handleSelectionChanged}
                    onGridReady={handleGridReady}
                    rowHeight={80}
                    headerHeight={40}
                    rowGroupPanelShow="never"
                    groupDefaultExpanded={1}
                    groupDisplayType="groupRows"
                    suppressAggFuncInHeader={true}
                    animateRows={true}
                />
            </div>
        );
    }
);

UnplannedTasksGrid.displayName = 'UnplannedTasksGrid';
import { useRef, useCallback, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { type ColDef, type GetRowIdParams, type SelectionChangedEvent, type GridReadyEvent, type GridApi } from 'ag-grid-community';
import type { Appointment } from '../lib/Appointment';
import { useUnplannedTasks } from '../hooks/useUnplannedTasks';
import { AppointmentDragHelper } from '../utils/appointmentDragHelper';

export const UnplannedTasksGrid = ({ scheduler, onSelectionChange }) => {
    const gridRef = useRef<AgGridReact>(null);
    const gridApiRef = useRef<GridApi | null>(null);
    const dragHelperRef = useRef<AppointmentDragHelper | null>(null);

    const { tasks, loading, error } = useUnplannedTasks(scheduler);

    const initializeDragHelper = useCallback(() => {
        if (!scheduler || !gridApiRef.current) return;

        const gridElement = document.querySelector('.ag-grid-container') as HTMLElement;
        if (!gridElement) return;

        // Clean up existing drag helper before creating a new one
        dragHelperRef.current?.destroy();
        dragHelperRef.current = new AppointmentDragHelper({
            scheduler,
            gridApi      : gridApiRef.current,
            outerElement : gridElement
        });

        // Return cleanup function
        return () => dragHelperRef.current?.destroy();
    }, [scheduler]);

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


    // Initialize drag helper when scheduler changes and clean up on unmount
    useEffect(() => {
        const cleanup = initializeDragHelper();
        return cleanup;
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
                <div style={{ display : 'flex', alignItems : 'center' }}>
                    <i className={`b-fa b-fa-${data.iconCls}`} />
                    <div style={{ display : 'flex', flexDirection : 'column', justifyContent : 'center', gap : '2px', minWidth : 0, flex : 1 }}>
                        <span>{data.name}</span>
                        <span style={{ fontSize : '12px', color : '#666' }}>Patient: {data.patient}</span>
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
            },
            cellRenderer : ({ data }: { data: Appointment }) => (
                <div>
                    {data.patient}
                </div>
            )
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
            rowGroup     : true,
            hide         : false,
            cellRenderer : ({ data }: { data: Appointment }) => (
                <div>
                    {data.requiredRole}
                </div>
            )
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
                <div>
                    {data.duration} {data.durationUnit}{data.duration === 1 ? '' : 's'}
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
                rowHeight={65}
                headerHeight={40}
                rowGroupPanelShow="never"
                groupDefaultExpanded={1}
                groupDisplayType="groupRows"
                suppressAggFuncInHeader={true}
                animateRows={true}
            />
        </div>
    );
};

UnplannedTasksGrid.displayName = 'UnplannedTasksGrid';
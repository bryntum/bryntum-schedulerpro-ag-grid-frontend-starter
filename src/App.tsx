import { useRef, useState, useEffect, useCallback, type RefObject } from 'react';
import { BryntumSchedulerPro, BryntumSplitter, BryntumToolbar
} from '@bryntum/schedulerpro-react';
import { SchedulerPro, SchedulerResourceModel } from '@bryntum/schedulerpro';
import { schedulerConfig, projectConfig } from './AppConfig';
import SchedulerToolbar from './components/SchedulerToolbar';
import { UnplannedTasksGrid, type UnplannedTasksGridRef } from './components/UnplannedTasksGrid';
import type { Appointment } from './lib/Appointment';
import { Doctor } from './lib/Doctor';
import './App.css';

function App() {
    const gridRef             = useRef<UnplannedTasksGridRef>(null);
    const schedulerRef        = useRef<BryntumSchedulerPro>(null);
    const schedulerToolbarRef = useRef<BryntumToolbar>(null);

    const [scheduler, setScheduler]       = useState<SchedulerPro>();
    const [toggleLayout, setToggleLayout] = useState(false);

    useEffect(() => {
        setScheduler(schedulerRef.current?.instance);
    }, [schedulerRef]);

    const onSchedulerSelectionChange = useCallback(() => {
        const selectedRecords       = scheduler!.selectedRecords as SchedulerResourceModel[];
        const { calendarHighlight } = scheduler!.features;
        if (selectedRecords.length > 0) {
            calendarHighlight.highlightResourceCalendars(selectedRecords);
        }
        else {
            calendarHighlight.unhighlightCalendars();
        }
    }, [scheduler]);

    const onGridSelectionChange = useCallback((selectedRecords: Appointment[]) => {
        if (!scheduler) return;

        const { calendarHighlight } = scheduler.features;
        const requiredRoles: Record<string, number> = {};

        selectedRecords.forEach((appointment: Appointment) => requiredRoles[appointment.requiredRole as string] = 1);

        if (Object.keys(requiredRoles).length === 1) {
            const appointment        = selectedRecords[0];
            const availableResources = scheduler.resourceStore
                .query((doctor: Doctor) => doctor.role === appointment.requiredRole || !appointment.requiredRole) as SchedulerResourceModel[];
            calendarHighlight.highlightResourceCalendars(availableResources);
        }
        else {
            calendarHighlight.unhighlightCalendars();
        }
    }, [scheduler]);

    return (
        <div id="content" className={toggleLayout ? '' : 'b-side-by-side'}>
            <div className="scheduler-container">
                <SchedulerToolbar
                    ref={schedulerToolbarRef}
                    schedulerRef={schedulerRef as RefObject<BryntumSchedulerPro>}
                    toggleLayout={toggleLayout}
                    setToggleLayout={setToggleLayout}
                />
                <BryntumSchedulerPro
                    ref={schedulerRef}
                    {...schedulerConfig}
                    project={projectConfig}
                    onSelectionChange={onSchedulerSelectionChange}
                />
            </div>
            <BryntumSplitter/>
            <div className="grid-container">
                <div style={{ padding : '10px', borderBottom : '1px solid #ddd' }}>
                    <h3 style={{ fontSize : '14px', fontWeight : 'bold' }}>Unplanned Tasks</h3>
                    <p style={{ margin : '4px 0 0 0', fontSize : '12px', color : '#666' }}>Drag tasks to the scheduler to assign them</p>
                </div>
                <UnplannedTasksGrid
                    ref={gridRef}
                    scheduler={scheduler}
                    onSelectionChange={onGridSelectionChange}
                />
            </div>
        </div>
    );
}

export default App;

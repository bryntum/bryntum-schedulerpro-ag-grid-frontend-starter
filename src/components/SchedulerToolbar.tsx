import { forwardRef, useCallback, type RefObject, useEffect, useState } from 'react';
import { BryntumSchedulerPro, BryntumToolbar } from '@bryntum/schedulerpro-react';
import { DateHelper, Model, SchedulerPro } from '@bryntum/schedulerpro';

type SchedulerToolbarProps = {
    schedulerRef: RefObject<BryntumSchedulerPro>
    toggleLayout: boolean
    setToggleLayout: React.Dispatch<React.SetStateAction<boolean>>
}

const SchedulerToolbar = forwardRef<BryntumToolbar, SchedulerToolbarProps>((props, schedulerToolbarRef) => {
    const startHour = 7;
    const endHour = 20;

    const {
        schedulerRef,
        toggleLayout,
        setToggleLayout
    } = props;

    const [scheduler, setScheduler] = useState<SchedulerPro>();

    useEffect(() => {
        setScheduler(schedulerRef.current!.instance);
    }, [scheduler, schedulerRef, schedulerToolbarRef]);


    const onSelect = useCallback((event: { record: Model }) => {
        const value     = event.record.get('value') as number;
        const startDate = DateHelper.add(DateHelper.clearTime(scheduler!.startDate), startHour, 'h');
        const endDate   = DateHelper.add(startDate, value - 1, 'd');

        endDate.setHours(endHour);
        scheduler!.viewPreset = event.record.get('preset');
        scheduler!.setTimeSpan(startDate, endDate);

        // reset scroll
        scheduler!.scrollLeft = 0;
    }, [scheduler]);

    const onShiftPrevious = useCallback(() => {
        scheduler!.shiftPrevious();
    }, [scheduler]);

    const onShiftNext = useCallback(() => {
        scheduler!.shiftNext();
    }, [scheduler]);

    const onClickToday = useCallback(() => {
        const startDate = DateHelper.clearTime(new Date());
        scheduler!.setTimeSpan(DateHelper.add(startDate, startHour, 'h'), DateHelper.add(startDate, endHour, 'h'));
    }, [scheduler]);

    const onToggleLayout = useCallback(() => {
        setToggleLayout(!toggleLayout);
    }, [setToggleLayout, toggleLayout]);

    return <BryntumToolbar
        ref={schedulerToolbarRef}
        items={[
            {
                type         : 'combo',
                ref          : 'preset',
                editable     : false,
                label        : 'Show',
                value        : 1,
                valueField   : 'value',
                displayField : 'name',
                items        : [
                    {
                        name   : '1 day',
                        value  : 1,
                        preset : {
                            base      : 'hourAndDay',
                            tickWidth : 45
                        }
                    },
                    {
                        name   : '3 days',
                        value  : 3,
                        preset : {
                            base : 'dayAndWeek'
                        }
                    },
                    {
                        name   : '1 week',
                        value  : 7,
                        preset : {
                            base : 'dayAndWeek'
                        }
                    }
                ],
                onSelect
            },
            '->',
            {
                type  : 'buttonGroup',
                items : [
                    {
                        icon     : 'b-icon b-fa-chevron-left',
                        cls      : 'b-transparent',
                        onAction : onShiftPrevious
                    },
                    {
                        type     : 'button',
                        text     : 'Today',
                        cls      : 'b-transparent',
                        onAction : onClickToday
                    },
                    {
                        icon     : 'b-icon b-fa-chevron-right',
                        cls      : 'b-transparent',
                        onAction : onShiftNext
                    }
                ]
            },
            '->',
            {
                icon       : 'b-fa b-fa-columns',
                tooltip    : 'Toggle layout',
                cls        : 'b-transparent',
                ref        : 'toggle-layout', // for testing purpose
                toggleable : true,
                onAction   : onToggleLayout,
                style      : 'margin-left: auto'
            }
        ]}
    />;

});

SchedulerToolbar.displayName = 'SchedulerToolbar';

export default SchedulerToolbar;

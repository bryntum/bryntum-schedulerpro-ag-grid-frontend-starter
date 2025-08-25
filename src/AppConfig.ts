import { CalendarModel, DateHelper, type ProjectModelConfig, ResourceModel, SchedulerPro, StringHelper } from '@bryntum/schedulerpro';
import { type BryntumSchedulerProProps } from '@bryntum/schedulerpro-react';

import { Appointment } from './lib/Appointment';
import { Doctor } from './lib/Doctor';

export const projectConfig: ProjectModelConfig = {
    autoLoad  : true,
    autoSync  : true,
    transport : {
        load : {
            url : 'http://localhost:1337/api/load'
        },
        sync : {
            url : 'http://localhost:1337/api/sync'
        }
    },
    resourceStore : {
        modelClass : Doctor,
        sorters    : [
            { field : 'name', ascending : true }
        ]
    },
    eventStore : {
        // Unassigned events should remain in store
        removeUnassignedEvent : false,
        modelClass            : Appointment
    },
    // This config enables response validation and dumping of found errors to the browser console.
    // It's meant to be used as a development stage helper only so please set it to false for production systems.
    validateResponse : true
};

export const schedulerConfig: BryntumSchedulerProProps = {
    startDate           : new Date(2025, 9, 20, 9),
    endDate             : new Date(2025, 9, 20, 19),
    rowHeight           : 80,
    barMargin           : 10,
    eventStyle          : 'border',
    eventColor          : 'indigo',
    allowOverlap        : false,
    useInitialAnimation : false,
    // add path to images
    resourceImagePath   : 'http://localhost:5173/images/users/',
    columns             : [
        {
            type           : 'resourceInfo',
            text           : 'Doctor',
            width          : 230,
            showEventCount : false,
            showMeta       : (resourceRecord) => {
                const { role, roleIconCls } = resourceRecord as Doctor;
                return `<i class="${roleIconCls}"></i>${role}`;
            },
            filterable : {
                filterField : {
                    triggers : {
                        search : {
                            cls : 'b-icon b-fa-filter'
                        }
                    },
                    placeholder : 'Filter staff'
                }
            }
        },
        {
            type       : 'column',
            text       : 'Hours',
            width      : 105,
            editor     : false,
            filterable : false,
            sortable   : false,
            align      : 'right',
            renderer   : ({ record, grid }) => {
                const
                    scheduler = grid as SchedulerPro,
                    calendar  = (record as ResourceModel)?.calendar as CalendarModel,
                    ranges    = calendar?.getWorkingTimeRanges?.(scheduler.startDate, scheduler.endDate);
                if (ranges?.length) {
                    const range = ranges[0];
                    return `${DateHelper.format(range.startDate, 'K')} - ${DateHelper.format(range.endDate, 'K')}`;
                }
                else {
                    return '';
                }
            }
        }
    ],

    // Custom view preset with header configuration
    viewPreset : {
        base           : 'hourAndDay',
        columnLinesFor : 1,
        headers        : [
            {
                unit       : 'd',
                align      : 'center',
                dateFormat : 'dddd'
            },
            {
                unit       : 'h',
                align      : 'center',
                dateFormat : 'HH'
            }
        ]
    },

    stripeFeature      : true,
    columnLinesFeature : true,
    filterBarFeature   : {
        compactMode : true
    },
    calendarHighlightFeature : {
        calendar : 'resource',
        // This method is provided to determine which resources are available for one or more eventRecords,
        // in order to highlight the right availability intervals
        collectAvailableResources({ scheduler, eventRecords }) {
            const appointment = eventRecords[0] as Appointment;
            return scheduler.resourceStore.query((doctor: Doctor) => doctor.role === appointment.requiredRole || !appointment.requiredRole) as ResourceModel[];
        }
    },
    // Configure event menu items with correct phrases (could also be done through localization)
    eventMenuFeature : {
        items : {
            deleteEvent : {
                text : 'Delete appointment'
            },
            unassignEvent : {
                text : 'Unschedule appointment'
            }
        }
    },
    eventDragFeature : {
        validatorFn({ eventRecords, newResource, startDate, endDate }) {
            const task = eventRecords[0] as Appointment;
            const doctor = newResource as Doctor;
            const { calendar } = doctor;

            const valid = doctor.role === task.requiredRole && (!calendar || (typeof calendar !== 'string' && calendar.isWorkingTime(startDate, endDate)));
            const message = valid ? '' : 'No available slot';

            return {
                valid,
                message : (valid ? '' : '<i class="b-icon b-fa-exclamation-triangle"></i>') + message
            };
        }
    },
    taskEditFeature : {
        editorConfig : {
            title : 'Appointment'
        },

        // Customize its contents inside the General tab
        items : {
            generalTab : {
                // Add a patient field
                items : {
                    // Add a patient field
                    orderField : {
                        type   : 'text',
                        name   : 'patient',
                        label  : 'Patient',
                        // Place after name field
                        weight : 150
                    }
                }
            }
        }
    },

    eventRenderer({ eventRecord }) {
        return [
            {
                children : [
                    {
                        class : 'b-event-name',
                        text  : eventRecord.name
                    },
                    {
                        class : 'b-patient',
                        html  : StringHelper.xss`<div>Patient: ${(eventRecord as Appointment).patient || ''}</div>`
                    }
                ]
            }
        ];
    }
};
import { DragHelper, StringHelper, DateHelper, SchedulerPro } from '@bryntum/schedulerpro';
import type { GridApi } from 'ag-grid-community';
import type { Appointment } from '../lib/Appointment';
import { Doctor } from '../lib/Doctor';

type DragConfig = {
  scheduler: SchedulerPro;
  gridApi: GridApi;
  outerElement: HTMLElement;
}

type Context = { appointment: Appointment; appointments: Appointment[]; totalDuration: number };

export class AppointmentDragHelper extends DragHelper {
    private scheduler: SchedulerPro;
    private gridApi: GridApi;

    static configurable = {
        callOnFunctions      : true,
        autoSizeClonedTarget : false,
        unifiedProxy         : true,
        removeProxyAfterDrop : true,
        cloneTarget          : true,
        dropTargetSelector   : '.b-timeline-subgrid',
        targetSelector       : '.ag-row'
    };

    constructor(config: DragConfig) {
        super({ outerElement : config.outerElement });
        this.scheduler = config.scheduler;
        this.gridApi = config.gridApi;
    }

    createProxy(grabbedElement: HTMLElement) {
        const rowId = grabbedElement.getAttribute('row-id');
        const rowNode = this.gridApi.getRowNode(rowId || '');
        const appointment = rowNode?.data as Appointment;

        if (!appointment) return document.createElement('div');

        const durationInPixels = this.scheduler.timeAxisViewModel.getDistanceForDuration(
            appointment.duration * 60 * 60 * 1000
        );
        const proxy = document.createElement('div');

        Object.assign(proxy.style, {
            width    : `${durationInPixels}px`,
            maxWidth : `${this.scheduler.timeAxisSubGrid.width}px`,
            height   : `${this.scheduler.rowHeight - 2 * (this.scheduler.resourceMargin as number)}px`
        });

        proxy.classList.add('b-sch-event-wrap', 'b-sch-style-border', 'b-unassigned-class', 'b-sch-horizontal');
        proxy.innerHTML = `
      <div class="b-sch-event b-has-content b-sch-event-withicon">
        <div class="b-sch-event-content">
          <i class="b-icon b-fa-${appointment.iconCls}"></i>
          <div>
            <div>${StringHelper.encodeHtml(appointment.name)}</div>
            <div class="patient-name">Patient: ${StringHelper.encodeHtml(appointment.patient || '')}</div>
          </div>
        </div>
      </div>
    `;

        this.context.appointment = appointment;
        this.context.totalDuration = appointment.duration;
        return proxy;
    }

    onDragStart({ context }: { context: Context }) {
        const appointment = context.appointment;
        context.appointments = [appointment];

        this.scheduler.enableScrollingCloseToEdges(this.scheduler.timeAxisSubGrid);
        this.scheduler.features.eventTooltip.disabled = true;

        // Highlight available resources
        const { calendarHighlight } = this.scheduler.features;
        if (calendarHighlight && appointment.requiredRole) {
            const availableResources = this.scheduler.resourceStore.query((resource: Doctor) =>
                resource.role === appointment.requiredRole || !appointment.requiredRole
            );
            calendarHighlight.highlightResourceCalendars(availableResources as Doctor[]);
        }
    }

    onDrag({ context }: { context: Context }) {
        const { appointments, totalDuration } = context;
        const requiredRole = appointments[0].requiredRole;
        const newStartDate = this.scheduler.getDateFromCoordinate(context.newX, 'round', false);
        const lastAppointmentEndDate = newStartDate && DateHelper.add(newStartDate, totalDuration, appointments[0].durationUnit);
        const doctor = context.target && this.scheduler.resolveResourceRecord(context.target);
        const calendar = doctor?.effectiveCalendar;

        context.valid = Boolean(
            newStartDate &&
      (!requiredRole || doctor?.role === requiredRole) &&
      (this.scheduler.allowOverlap || this.scheduler.isDateRangeAvailable(newStartDate, lastAppointmentEndDate, null, doctor)) &&
      (!calendar || calendar.isWorkingTime(newStartDate, lastAppointmentEndDate, true))
        );

        context.doctor = doctor;
    }

    async onDrop({ context }: { context: Context }) {
        if (context.valid) {
            const { appointments, doctor } = context;
            const dropDate = this.scheduler.getDateFromCoordinate(context.newX, 'round', false);

            if (!dropDate || !doctor) return;

            try {
                for (let i = 0; i < appointments.length; i++) {
                    const appointment = appointments[i];
                    const appointmentData = {
                        ...appointment,
                        iconCls    : `b-fa b-fa-${appointment.iconCls}`,
                        eventColor : appointment.eventColor || 'indigo'
                    };

                    const { project } = this.scheduler;
                    let existingEvent = project.eventStore.getById(appointment.id);

                    if (!existingEvent) {
                        existingEvent = project.eventStore.add(appointmentData)[0];
                    }

                    await this.scheduler.scheduleEvent({
                        eventRecord    : existingEvent,
                        startDate      : i === 0 ? dropDate : appointments[i - 1].endDate,
                        resourceRecord : doctor
                    });

                    // Remove from AG Grid
                    const gridRowNode = this.gridApi.getRowNode(appointment.id.toString());
                    if (gridRowNode?.data) {
                        this.gridApi.applyTransaction({ remove : [gridRowNode.data] });
                    }
                }
            }
            catch (error) {
                console.error('Error scheduling event:', error);
            }
        }

        // Cleanup
        const { calendarHighlight } = this.scheduler.features;
        if (calendarHighlight) {
            calendarHighlight.unhighlightCalendars();
        }

        this.scheduler.disableScrollingCloseToEdges(this.scheduler.timeAxisSubGrid);
        this.scheduler.features.eventTooltip.disabled = false;
    }
}
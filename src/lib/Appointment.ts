import { EventModel } from '@bryntum/schedulerpro';

// Custom Appointment model, based on EventModel with additional fields and changed defaults
export class Appointment extends EventModel {

    declare patient: string;
    declare requiredRole : string;
    declare confirmed: boolean;

    static fields = [
        'patient',
        'requiredRole',
        'confirmed',
        // override field defaultValue to hours
        { name : 'durationUnit', defaultValue : 'h' }
    ];
}

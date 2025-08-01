import { ResourceModel } from '@bryntum/schedulerpro';

export class Doctor extends ResourceModel {

    declare role : string;
    declare roleIconCls : string;

    static fields = [
        'role',
        'roleIconCls'
    ];
}

import {
    createMongoAbility,
    type ForcedSubject,
    type CreateAbility,
    type MongoAbility,
    AbilityBuilder
} from '@casl/ability';

import type { User } from './models/user';

import { z } from 'zod';
import { permissions } from './permissions';
import { inviteSubject } from './subjects/invite';
import { billingSubject } from './subjects/billing';
import { organizationSubject } from './subjects/organization';
import { projectSubject } from './subjects/project';
import { userSubject } from './subjects/user';



// type AppAbilities = UserSubject | ProjectSubject | ['manage', 'all']

export * from './models/user';
export * from './models/organization';
export * from './models/project';

const AppAbilitiesSchema = z.union([
    projectSubject,
    userSubject,
    billingSubject,
    organizationSubject,
    inviteSubject,

    z.tuple([z.literal('manage'), z.literal('all')])
]) 

type AppAbilities = z.infer<typeof AppAbilitiesSchema>

export type AppAbility = MongoAbility<AppAbilities>;

export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

export function defineAbilityFor(user: User) {
    const builder = new AbilityBuilder<AppAbility>(createAppAbility);

    if (typeof permissions[user.role] !== 'function') {
        throw new Error(`No permissions defined for role: ${user.role}`)
    }

    permissions[user.role](user, builder)

    const ability = builder.build({
        detectSubjectType(subject){
            return subject.__typename
        },
    })

    return ability
}
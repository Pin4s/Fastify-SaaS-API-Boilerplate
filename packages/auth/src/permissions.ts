import { AbilityBuilder } from "@casl/ability";
import type { AppAbility } from ".";
import type { User } from "./models/user";
import type { Role } from "./roles";

type PermissionsByRole = (
    user: User,
    builder: AbilityBuilder<AppAbility>
) => void;

export const permissions: Record<Role, PermissionsByRole> = {
    ADMIN(user, { can, cannot }) {
        can('manage', 'all');

        cannot('trasnfer_ownership', 'Organization')
        can('trasnfer_ownership', 'Organization', { ownerId: { $eq: user.id } });

        cannot('update', 'Organization');
        can('update', 'Organization', { ownerId: { $eq: user.id } })
    },
    MEMBER(user, { can }) {
        can('get', 'User')
        can(['create', 'get'], 'Project')
        can(['update', 'delete'], 'Project', { ownerId: { $eq: user.id } })
    },
    BILLING(_, {can}) {
        can('manage', 'Billing')
    }
}
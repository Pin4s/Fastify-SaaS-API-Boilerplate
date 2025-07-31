import { ability } from "@saas/auth"

const userCanInvite = ability.can('invite', 'User');
const userCanDelete = ability.can('delete', 'User');



console.log(`User can invite: ${userCanInvite}`);
console.log(`User can delete: ${userCanDelete}`);
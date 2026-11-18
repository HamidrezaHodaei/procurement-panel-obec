import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import {
  CHEQUE_STATUS, GUARANTEE_STATUS, PROCESS_STATUS, PURCHASE_TYPE, STAGE_STATUS
} from '../constants';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';
type Def = { label: string; variant: Variant; icon?: keyof typeof Icons };

const DICT: Record<string, Record<string, Def>> = {
  purchaseType: {
    domestic: { label: PURCHASE_TYPE.domestic, variant: 'secondary' },
    foreign: { label: PURCHASE_TYPE.foreign, variant: 'outline' }
  },
  processStatus: {
    active: { label: PROCESS_STATUS.active, variant: 'default', icon: 'clock' },
    completed: { label: PROCESS_STATUS.completed, variant: 'secondary', icon: 'circleCheck' },
    cancelled: { label: PROCESS_STATUS.cancelled, variant: 'destructive', icon: 'xCircle' }
  },
  stageStatus: {
    paid: { label: STAGE_STATUS.paid, variant: 'secondary', icon: 'circleCheck' },
    unpaid: { label: STAGE_STATUS.unpaid, variant: 'outline', icon: 'clock' },
    overdue: { label: STAGE_STATUS.overdue, variant: 'destructive', icon: 'alertCircle' }
  },
  chequeStatus: {
    pending: { label: CHEQUE_STATUS.pending, variant: 'outline', icon: 'clock' },
    cashed: { label: CHEQUE_STATUS.cashed, variant: 'secondary', icon: 'circleCheck' },
    bounced: { label: CHEQUE_STATUS.bounced, variant: 'destructive', icon: 'xCircle' }
  },
  guaranteeStatus: {
    active: { label: GUARANTEE_STATUS.active, variant: 'default', icon: 'shield' },
    returned: { label: GUARANTEE_STATUS.returned, variant: 'secondary', icon: 'circleCheck' },
    collected: { label: GUARANTEE_STATUS.collected, variant: 'outline', icon: 'check' },
    cancelled: { label: GUARANTEE_STATUS.cancelled, variant: 'destructive', icon: 'xCircle' }
  }
};

export type BadgeKind = keyof typeof DICT;

export function StatusBadge({ kind, value }: { kind: BadgeKind | string; value: string | null | undefined }) {
  if (!value) return <span className='text-muted-foreground'>—</span>;
  const d = DICT[kind]?.[value];
  if (!d) return <Badge variant='outline'>{value}</Badge>;
  const Icon = d.icon ? Icons[d.icon] : null;
  return (
    <Badge variant={d.variant}>
      {Icon && <Icon />}
      {d.label}
    </Badge>
  );
}

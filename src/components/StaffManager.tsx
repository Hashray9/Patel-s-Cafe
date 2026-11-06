import React, { useCallback, useEffect, useState } from 'react';
import { Users, Send, Loader, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../api';
import type { StaffMember, UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  owner: '👑 Owner',
  counter: '🏢 Counter',
  cook: '👨‍🍳 Kitchen',
};

const ROLE_HELP: Record<UserRole, string> = {
  owner: 'Everything, incl. staff, settings & resets',
  counter: 'Floor plan, orders, menu & reports',
  cook: 'Kitchen display only',
};

/** Owner-only team management: list, invite, change role, remove. */
export const StaffManager: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('counter');
  const [submitting, setSubmitting] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const loadStaff = useCallback(async () => {
    try {
      setStaff(await api<StaffMember[]>('/api/staff'));
    } catch (err) {
      setError(errorMessage(err, 'Could not load staff.'));
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStaff();
  }, [loadStaff]);

  const flashSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 6000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await api<{ status: 'invited' | 'added'; member: StaffMember }>('/api/staff', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role }),
      });
      setStaff(prev => [...prev, result.member]);
      flashSuccess(result.status === 'invited'
        ? `Invitation sent to ${result.member.email}. They'll get an email to set their password.`
        : `${result.member.email} already had an account and was added to your team. They can sign in now.`);
      setEmail('');
    } catch (err) {
      setError(errorMessage(err, 'Could not invite staff member.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (member: StaffMember, newRole: UserRole) => {
    if (newRole === member.role) return;
    if (member.isYou && newRole !== 'owner' &&
        !window.confirm('You will lose owner access (staff, settings, resets). Continue?')) {
      return;
    }
    setBusyUserId(member.userId);
    setError('');
    try {
      const updated = await api<StaffMember>(`/api/staff/${member.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      if (member.isYou) {
        // Our own permissions changed — reload so the whole app picks it up.
        window.location.reload();
        return;
      }
      setStaff(prev => prev.map(s => s.userId === member.userId ? updated : s));
    } catch (err) {
      setError(errorMessage(err, 'Could not change role.'));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (member: StaffMember) => {
    const prompt = member.isYou
      ? 'Remove yourself from this cafe? You will lose access immediately.'
      : `Remove ${member.email} from your cafe? They will lose access immediately.`;
    if (!window.confirm(prompt)) return;

    setBusyUserId(member.userId);
    setError('');
    try {
      await api(`/api/staff/${member.userId}`, { method: 'DELETE' });
      if (member.isYou) {
        window.location.reload();
        return;
      }
      setStaff(prev => prev.filter(s => s.userId !== member.userId));
      flashSuccess(`${member.email} was removed.`);
    } catch (err) {
      setError(errorMessage(err, 'Could not remove staff member.'));
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="neo-brutal-card bg-surface rounded-xl p-6 space-y-4">
      <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 border-b-2 border-on-surface pb-2 select-none">
        <Users size={20} className="stroke-[2.5]" />
        Staff & Roles
      </h3>

      <p className="font-body-md text-[13.5px] text-on-surface-variant font-medium">
        Everyone here can only see this cafe's data. Invite as many counter and kitchen staff as you need.
      </p>

      {success && (
        <div className="p-3.5 bg-[#b2f0cf] text-[#006e3a] border-2 border-black rounded-lg font-bold text-[13.5px] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
          <CheckCircle size={18} className="stroke-[2.5] shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-[#ffdad6] text-[#ba1a1a] border-2 border-black rounded-lg font-bold text-[13.5px] flex items-start gap-2 shadow-[2px_2px_0px_0px_#000000]">
          <AlertTriangle size={18} className="stroke-[2.5] shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Team list */}
      <div className="space-y-2.5">
        {loadingList ? (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-on-surface-variant py-2">
            <Loader size={16} className="animate-spin" /> Loading team...
          </div>
        ) : (
          staff.map(member => (
            <div
              key={member.userId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg border-2 border-black bg-surface-container-low"
            >
              <div className="min-w-0">
                <span className="block font-bold text-[14px] text-black truncate">
                  {member.email || member.userId}
                  {member.isYou && <span className="ml-1.5 text-[11px] font-bold text-on-surface-variant">(you)</span>}
                </span>
                <span className="block text-[11.5px] font-medium text-on-surface-variant">
                  {ROLE_HELP[member.role]}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={member.role}
                  disabled={busyUserId === member.userId}
                  onChange={e => handleRoleChange(member, e.target.value as UserRole)}
                  className="neo-brutal-input text-[13px] py-1.5 px-2 rounded-lg bg-surface font-semibold"
                  aria-label={`Role for ${member.email}`}
                >
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleRemove(member)}
                  disabled={busyUserId === member.userId}
                  className="p-2 bg-white text-black hover:bg-error-container hover:text-error border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title={`Remove ${member.email}`}
                >
                  {busyUserId === member.userId
                    ? <Loader size={16} className="animate-spin" />
                    : <Trash2 size={16} className="stroke-[2.5]" />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="border-t-2 border-on-surface pt-4 space-y-3">
        <h4 className="font-label-bold text-label-bold text-on-surface select-none">Invite Staff Member</h4>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="staff@yourcafe.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={submitting}
            className="neo-brutal-input flex-1 text-[14px] py-2.5 px-3 rounded-lg"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            disabled={submitting}
            className="neo-brutal-input text-[14px] py-2.5 px-3 rounded-lg bg-surface font-semibold sm:w-40"
            aria-label="Role for new staff member"
          >
            <option value="counter">{ROLE_LABELS.counter}</option>
            <option value="cook">{ROLE_LABELS.cook}</option>
            <option value="owner">{ROLE_LABELS.owner}</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="neo-brutal-btn bg-[#ffd982] text-black py-2.5 px-5 rounded-lg font-label-bold text-[14px] flex items-center justify-center gap-2 border-2 border-black shadow-[2px_2px_0px_0px_#000000] cursor-pointer shrink-0"
          >
            {submitting ? (
              <>
                <Loader size={16} className="animate-spin stroke-[2.5]" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} className="stroke-[2.5]" />
                Invite
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StaffManager;

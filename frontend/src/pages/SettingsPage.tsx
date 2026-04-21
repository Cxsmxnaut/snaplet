import { type ReactNode, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Globe, LogOut, Moon, ShieldCheck, Sparkles, Sun, Timer, Trash2, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { loadAvatarPreset, saveAvatarPreset } from '../features/auth/services/profilePreferences';
import ToggleSwitch from '../components/ui/toggle-switch';

type ThemeMode = 'dark' | 'light';

const AVATAR_SWATCHES = [
  'from-[#63AD9E] to-[#BEEBE0]',
  'from-[#FFB95F] to-[#FFD98B]',
  'from-[#4EDEA3] to-[#8BEAC2]',
  'from-[#D78BFF] to-[#F0B8FF]',
  'from-[#6CCBFF] to-[#B1E6FF]',
  'from-[#FF8FA5] to-[#FFC2CF]',
];

export const SettingsPage = ({
  onLogout,
  userProfile,
  theme,
  onThemeChange,
}: {
  onLogout: () => void;
  userProfile: {
    displayName: string;
    email: string;
    avatarUrl: string | null;
  };
  theme: ThemeMode;
  onThemeChange: (value: ThemeMode) => void;
}) => {
  const [sessionLength, setSessionLength] = useState(() => {
    const stored = Number(window.localStorage.getItem('snaplet_session_length') ?? 10);
    return [5, 10, 15].includes(stored) ? stored : 10;
  });
  const [studyUpdates, setStudyUpdates] = useState(() => window.localStorage.getItem('snaplet_notify_study_updates') !== 'false');
  const [reviewReminders, setReviewReminders] = useState(() => window.localStorage.getItem('snaplet_notify_review_reminders') !== 'false');
  const [privateProfile, setPrivateProfile] = useState(() => window.localStorage.getItem('snaplet_private_profile') === 'true');
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState<string | null>(() => loadAvatarPreset());
  const [showUpgradeSheet, setShowUpgradeSheet] = useState(false);

  const visibleAvatar = useMemo(() => userProfile.avatarUrl ?? null, [userProfile.avatarUrl]);

  const setSessionLengthAndPersist = (value: number) => {
    setSessionLength(value);
    window.localStorage.setItem('snaplet_session_length', String(value));
  };

  const updateStudyUpdates = (value: boolean) => {
    setStudyUpdates(value);
    window.localStorage.setItem('snaplet_notify_study_updates', String(value));
  };

  const updateReviewReminders = (value: boolean) => {
    setReviewReminders(value);
    window.localStorage.setItem('snaplet_notify_review_reminders', String(value));
  };

  const updatePrivateProfile = (value: boolean) => {
    setPrivateProfile(value);
    window.localStorage.setItem('snaplet_private_profile', String(value));
  };

  const handleSelectAvatar = (gradient: string | null) => {
    setSelectedAvatarPreset(gradient);
    saveAvatarPreset(gradient);
  };

  return (
    <div className="knowt-page-shell max-w-4xl px-1 pb-12">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-on-surface mb-2">Settings</h1>
        <p className="text-base md:text-lg text-on-surface-variant">Account details, this-device preferences, and support actions in one place.</p>
      </header>

      <div className="space-y-8">
        <SettingsSection
          label="Account"
          caption="These details come from your sign-in provider and follow your account."
        >
          <div className="px-6 py-6 border-b border-outline-variant/35">
            <div className="mb-4">
              <p className="text-sm font-bold text-on-surface mb-3">Profile picture</p>
              <div className="flex flex-wrap items-center gap-3">
                <AvatarCircle
                  image={visibleAvatar}
                  avatarPreset={selectedAvatarPreset}
                  initials={userProfile.displayName.slice(0, 1)}
                  large
                />
                {AVATAR_SWATCHES.map((gradient, index) => (
                  <DecorativeAvatar
                    key={gradient}
                    gradient={gradient}
                    label={`Preset avatar ${index + 1}`}
                    selected={selectedAvatarPreset === gradient}
                    onClick={() => handleSelectAvatar(gradient)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => handleSelectAvatar(null)}
                  className={cn(
                    "h-10 w-10 rounded-full border bg-surface text-on-surface-variant text-xl font-light transition-colors",
                    selectedAvatarPreset === null ? 'border-primary text-primary' : 'border-outline-variant/40'
                  )}
                  title="Use your provider photo or initials"
                >
                  +
                </button>
              </div>
            </div>
            <p className="text-sm text-on-surface-variant">
              Choose a local Snaplet avatar style or fall back to your sign-in provider photo.
            </p>
          </div>

          <SettingRow label="Name" value={userProfile.displayName} meta="Provider-managed" />
          <SettingRow label="Email" value={userProfile.email || 'No email available'} meta="Provider-managed" />
          <ActionRow
            label="Sign out"
            description="End this session on the current device."
            action={(
              <button
                onClick={onLogout}
                className="h-10 rounded-full bg-surface-container-low px-4 text-sm font-bold text-on-surface inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            )}
          />
          <ActionRow
            label="Delete account"
            description="This opens a real support request so we can complete deletion safely."
            action={(
              <a
                href="mailto:support@snaplet.app?subject=Delete%20my%20Snaplet%20account"
                className="h-10 rounded-full bg-error/12 px-4 text-sm font-bold text-error inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete account
              </a>
            )}
            withDivider={false}
          />
        </SettingsSection>

        <SettingsSection
          label="This device"
          caption="These preferences are stored locally on this browser. They do not sync across devices yet."
        >
          <div className="px-6 py-4 border-b border-outline-variant/35 bg-surface-container-low text-sm text-on-surface-variant">
            Use this area for how Snaplet looks and behaves on this device only.
          </div>
          <div className="px-6 py-5 border-b border-outline-variant/35 flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-bold text-on-surface">Theme</p>
              <p className="text-sm text-on-surface-variant">Choose how the signed-in app looks on this browser.</p>
            </div>
            <ThemeSelect value={theme} onChange={onThemeChange} />
          </div>
          <div className="px-6 py-5 border-b border-outline-variant/35 flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-bold text-on-surface">Session length</p>
              <p className="text-sm text-on-surface-variant">Default number of questions per study run on this device.</p>
            </div>
            <SessionLengthSelect value={sessionLength} onChange={setSessionLengthAndPersist} />
          </div>
          <ToggleRow
            label="Study updates"
            description="Show local nudges when a kit or practice pattern needs attention."
            checked={studyUpdates}
            onChange={updateStudyUpdates}
          />
          <ToggleRow
            label="Study reminders"
            description="Keep local reminder prompts on for this browser."
            checked={reviewReminders}
            onChange={updateReviewReminders}
          />
          <ToggleRow
            label="Private profile view"
            description="Hide your name and study activity within this device view only."
            checked={privateProfile}
            onChange={updatePrivateProfile}
            withDivider={false}
          />
        </SettingsSection>

        <SettingsSection
          label="Support"
          caption="Account upgrades and support still route through a direct team request."
        >
          <ActionRow
            label="Snaplet Plus"
            description="Billing is not live yet, but you can join the early upgrade list."
            action={(
              <button
                onClick={() => setShowUpgradeSheet(true)}
                className="h-10 rounded-full bg-surface-container-low px-4 text-sm font-bold text-on-surface shrink-0"
              >
                Upgrade
              </button>
            )}
          />
          <ActionRow
            label="Contact support"
            description="Email the team if something looks off or you need help with your account."
            action={(
              <a
                href="mailto:support@snaplet.app?subject=Snaplet%20Support%20Request"
                className="h-10 rounded-full bg-surface-container-low px-4 text-sm font-bold text-on-surface inline-flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Email support
              </a>
            )}
            withDivider={false}
          />
        </SettingsSection>

        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <ShieldCheck className="w-4 h-4" />
          <span>Provider-managed details sync with your account. Theme, reminders, and session defaults stay on this device.</span>
        </div>
      </div>

      {showUpgradeSheet ? (
        <div className="fixed inset-0 z-50 bg-on-surface/35 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-xl rounded-[30px] bg-surface p-8 ambient-shadow border border-outline-variant/10">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-2">Snaplet Plus</p>
                <h2 className="text-3xl font-headline font-black tracking-tight text-on-surface">Join the early upgrade list</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeSheet(false)}
                className="h-10 w-10 rounded-full bg-surface-container-low text-on-surface-variant"
                aria-label="Close upgrade details"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3 mb-8">
              <UpgradeBullet icon={<Sparkles className="w-4 h-4" />} title="Priority model access" body="Use the fastest and strongest generation providers by default." />
              <UpgradeBullet icon={<Globe className="w-4 h-4" />} title="Public sharing" body="Publish your strongest kits to read-only public share pages." />
              <UpgradeBullet icon={<Timer className="w-4 h-4" />} title="Longer sessions" body="Unlock longer defaults and more advanced review controls." />
            </div>

            <div className="rounded-[22px] bg-surface-container-low p-5 mb-8">
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Billing is not live yet, but the upgrade path is real now: this opens a direct request so we can invite you when Plus is ready.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:support@snaplet.app?subject=Snaplet%20Plus%20early%20access"
                className="flex-1 h-12 rounded-full gradient-primary text-on-primary font-bold inline-flex items-center justify-center gap-2"
              >
                Request early access
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setShowUpgradeSheet(false)}
                className="h-12 px-6 rounded-full bg-surface-container-low text-on-surface font-bold"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const SettingsSection = ({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: ReactNode;
}) => (
  <section>
    <div className="mb-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-on-surface-variant/65">{label}</p>
      {caption ? <p className="mt-2 text-sm text-on-surface-variant">{caption}</p> : null}
    </div>
    <div className="rounded-[24px] bg-surface overflow-hidden border border-outline-variant/20">{children}</div>
  </section>
);

const SettingRow = ({
  label,
  value,
  meta,
}: {
  label: string;
  value: string;
  meta: string;
}) => (
  <div className="px-6 py-5 border-b last:border-b-0 border-outline-variant/35 flex items-center justify-between gap-6">
    <div>
      <p className="text-sm font-bold text-on-surface">{label}</p>
      <p className="text-sm text-on-surface-variant">{value}</p>
    </div>
    <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{meta}</span>
  </div>
);

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
  withDivider = true,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  withDivider?: boolean;
}) => (
  <div className={cn('px-6 py-5 flex items-center justify-between gap-6', withDivider && 'border-b border-outline-variant/35')}>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-on-surface">{label}</p>
      <p className="text-sm text-on-surface-variant">{description}</p>
    </div>
    <ToggleSwitch checked={checked} onCheckedChange={onChange} className="shrink-0 text-transparent" />
  </div>
);

const ActionRow = ({
  label,
  description,
  action,
  withDivider = true,
}: {
  label: string;
  description: string;
  action: ReactNode;
  withDivider?: boolean;
}) => (
  <div className={cn('px-6 py-5 flex items-center justify-between gap-6', withDivider && 'border-b border-outline-variant/35')}>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-bold text-on-surface">{label}</p>
      <p className="text-sm text-on-surface-variant">{description}</p>
    </div>
    <div className="shrink-0">{action}</div>
  </div>
);

const ThemeSelect = ({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (value: ThemeMode) => void;
}) => (
  <div className="flex items-center rounded-full border border-outline-variant/30 bg-surface-container-low p-1">
    <ThemePill active={value === 'light'} onClick={() => onChange('light')} icon={<Sun className="w-4 h-4" />} label="Light" />
    <ThemePill active={value === 'dark'} onClick={() => onChange('dark')} icon={<Moon className="w-4 h-4" />} label="Dark" />
  </div>
);

const ThemePill = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative h-10 min-w-[92px] rounded-full px-4 inline-flex items-center justify-center gap-2 text-sm font-bold transition-colors duration-300',
      active ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
    )}
  >
    {active ? (
      <motion.span
        layoutId="settings-theme-pill"
        className="absolute inset-0 rounded-full bg-surface ambient-shadow"
        transition={{
          type: 'spring',
          stiffness: 380,
          damping: 30,
          mass: 0.8,
        }}
      />
    ) : null}
    <span className="relative z-10 inline-flex items-center gap-2">
      {icon}
      {label}
    </span>
  </button>
);

const SessionLengthSelect = ({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-10 appearance-none rounded-full bg-surface-container-low pl-4 pr-10 text-sm font-bold text-on-surface focus:outline-none"
    >
      <option value={5}>5 questions</option>
      <option value={10}>10 questions</option>
      <option value={15}>15 questions</option>
    </select>
    <Timer className="pointer-events-none absolute left-3 top-1/2 hidden -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
  </div>
);

const AvatarCircle = ({
  image,
  avatarPreset,
  initials,
  large = false,
}: {
  image: string | null;
  avatarPreset: string | null;
  initials: string;
  large?: boolean;
}) => (
  <div
    className={cn(
      'rounded-full overflow-hidden border border-outline-variant/30 bg-surface-container-low flex items-center justify-center',
      large ? 'h-14 w-14' : 'h-9 w-9'
    )}
  >
    {image ? (
      <img src={image} alt="Profile avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
    ) : avatarPreset ? (
      <div className={cn('h-full w-full bg-gradient-to-br', avatarPreset)} />
    ) : (
      <User className={cn('text-primary', large ? 'w-7 h-7' : 'w-4 h-4')} />
    )}
    {!image && <span className="sr-only">{initials}</span>}
  </div>
);

interface DecorativeAvatarProps {
  key?: string;
  gradient: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

function DecorativeAvatar({ gradient, label, selected, onClick }: DecorativeAvatarProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'h-9 w-9 rounded-full bg-gradient-to-br ring-2 transition-transform hover:scale-105',
        gradient,
        selected ? 'ring-primary ring-offset-2 ring-offset-white' : 'ring-white'
      )}
    />
  );
}

function UpgradeBullet({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] bg-surface-container-low p-4">
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-on-surface">{title}</p>
        <p className="text-sm text-on-surface-variant leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

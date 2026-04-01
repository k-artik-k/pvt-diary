import SettingsShell from '../components/SettingsShell';
import TagManager from '../components/TagManager';

export default function SettingsTags() {
  return (
    <SettingsShell title="Tags">
      <section className="settings-card">
        <TagManager />
      </section>
    </SettingsShell>
  );
}

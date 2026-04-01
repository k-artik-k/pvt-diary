import SettingsShell from '../components/SettingsShell';
import SpaceManager from '../components/SpaceManager';

export default function SettingsSpaces() {
  return (
    <SettingsShell title="Spaces">
      <section className="settings-card">
        <SpaceManager />
      </section>
    </SettingsShell>
  );
}

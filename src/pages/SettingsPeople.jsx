import SettingsShell from '../components/SettingsShell';
import PeopleManager from '../components/PeopleManager';

export default function SettingsPeople() {
  return (
    <SettingsShell title="People">
      <section className="settings-card">
        <PeopleManager />
      </section>
    </SettingsShell>
  );
}

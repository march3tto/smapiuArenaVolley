import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useToast } from '@/components/Toast';
import { YouthCard } from '@/components/YouthCard';
import { useApp } from '@/store/AppProvider';
import { useData } from '@/store/DataProvider';

export default function Giovanili() {
  const { youth, loading, refresh } = useData();
  const { prefs, toggleYouth } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState('all');
  const options = useMemo(() => [{ value: 'all', label: 'Tutte' }, ...youth.map((y) => ({ value: y.id, label: y.short }))], [youth]);
  const list = filter === 'all' ? youth : youth.filter((y) => y.id === filter);

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <SectionHeader big title="Giovanili" subtitle="Il settore giovanile Arena Volley. Tocca la campanella per seguire una squadra." />
      <SegmentedControl options={options} value={filter} onChange={setFilter} />
      <View style={{ gap: 14 }}>
        {list.map((y) => (
          <YouthCard
            key={y.id}
            team={y}
            following={prefs.youth.includes(y.id)}
            onToggle={() => {
              const on = toggleYouth(y.id);
              toast.show(on ? `Riceverai le notifiche dell'${y.name}.` : `Non riceverai più le notifiche dell'${y.name}.`, on ? Bell : BellOff);
            }}
          />
        ))}
      </View>
    </Screen>
  );
}

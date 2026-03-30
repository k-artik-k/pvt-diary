import { useEffect, useRef } from 'react';
import { toSvg } from 'jdenticon';

export default function Identicon({ value, size = 32 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = toSvg(value || 'default', size);
    }
  }, [value, size]);

  return <div ref={ref} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }} />;
}

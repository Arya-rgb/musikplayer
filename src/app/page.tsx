// src/app/page.tsx
import { VideoList } from '@/components/player/video-list';

export default function Home() {
  // VideoList now fetches its data from the Zustand store
  return <VideoList />;
}

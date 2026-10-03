import Image from 'next/image';
import { artwork } from '@/assets/manifest';
import type { RoomMemberView } from '@/domain/room-view';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { largestFrame } from '@/components/pixel/sprite-sheet';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import { TrainerAvatar } from '@/components/pixel/TrainerAvatar';
import { RouteRacer, racerStaggerPixels } from './RouteRacer';

const decorativeAlt = '';
// Racers stand with their feet on the route, so the biggest sprite needs room above, below and beside the art.
const sceneRoom = { padding: `${largestFrame.height / 2}px ${largestFrame.width / 2 + racerStaggerPixels}px ${largestFrame.height / 4}px` };
type Props = { members?: readonly RoomMemberView[]; passageLength?: number; label: string; youLabel?: string; mode?: 'race' | 'lobby' | 'camp' };
export function RouteScene({ members = [], passageLength = 1, label, youLabel, mode = 'race' }: Props) {
  return (
    <SpriteMotion showControls={mode === 'race'}>
      <div className="route-scene" style={sceneRoom}>
        <div className="route-stage">
          <Image src={artwork.route.src} width={800} height={440} alt={decorativeAlt} unoptimized className="route-art" priority />
          <div className="route-sign font-pixel font-bold uppercase">{label}</div>
          <div aria-hidden="true">
            {members.map((member, index) => <RouteRacer key={member.memberKey} member={member} index={index} passageLength={passageLength} youLabel={youLabel} mode={mode} />)}
            {mode === 'camp' && <div className="camp-pokemon route-companions"><TrainerAvatar /><PokemonSprite species="charmander" direction="southwest" scale={3} /></div>}
          </div>
        </div>
      </div>
    </SpriteMotion>
  );
}

import Image from 'next/image';
import { artwork } from '@/assets/manifest';
import type { RoomMemberView } from '@/domain/room-view';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { spriteBoxes } from '@/components/pixel/sprite-boxes';
import { SpriteMotion } from '@/components/pixel/SpriteMotion';
import { TrainerAvatar } from '@/components/pixel/TrainerAvatar';
import { RouteRacer } from './RouteRacer';

const decorativeAlt = '';
type SceneMode = 'race' | 'lobby' | 'camp';
// Racers stand with their feet on the route, so the biggest sprite needs room above, below and beside the art.
// The race map is short (from 120px of art), so a racer at the start needs more room below it.
function sceneRoomOf(mode: SceneMode) {
  const { width, height } = spriteBoxes.racePartner;
  const below = mode === 'race' ? (height * 3) / 8 : height / 4;
  return { padding: `${height / 2}px ${width / 2}px ${below}px` };
}
type Props = { members?: readonly RoomMemberView[]; passageLength?: number; label: string; youLabel?: string; mode?: SceneMode };
export function RouteScene({ members = [], passageLength = 1, label, youLabel, mode = 'race' }: Props) {
  return (
    <SpriteMotion showControls={mode === 'race'}>
      <div className="route-scene" style={sceneRoomOf(mode)}>
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

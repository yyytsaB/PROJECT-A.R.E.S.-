import team from '../content/team.json';
import { MissionIcon } from './MissionVisuals';

interface TeamMember { readonly name: string; readonly role?: string }
/** A local file under public/ (e.g. /assets/team/presentation.mp4) plays in a native player; anything else opens as a link. */
interface TeamVideo { readonly src: string; readonly title: string; readonly poster?: string; readonly captions?: string }

const members: readonly TeamMember[] = team.members;
const video = team.video as TeamVideo | null;
const initialsOf = (name: string) => { const parts = name.split(/\s+/).filter(part => part && !part.endsWith('.')); return `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase(); };

export function TeamSection({ active }: { active: boolean }) {
  return <section className="mission-section team-section" data-screen="team" data-active={active} aria-labelledby="team-heading">
    <p className="eyebrow">THE CREW BEHIND ARES</p>
    <h2 className="page-title" id="team-heading">Meet the Team</h2>
    <p className="team-intro">We are {team.teamName}. We built ARES for the NASA Space Apps Challenge.</p>
    <div className="team-layout">
      <figure className="team-photo">
        <img src={team.photo.src} alt={team.photo.alt} width={team.photo.width} height={team.photo.height} decoding="async" />
        <figcaption>Team {team.teamName}</figcaption>
      </figure>
      <div className="team-side">
        <section className="team-card" aria-labelledby="team-members-heading">
          <h3 id="team-members-heading">Team members</h3>
          <ul className="team-members">{members.map(member => <li key={member.name}><span className="team-initials" aria-hidden="true">{initialsOf(member.name)}</span><span><strong>{member.name}</strong>{member.role && <small>{member.role}</small>}</span></li>)}</ul>
        </section>
        <section className="team-card" aria-labelledby="team-pitch-heading">
          <h3 id="team-pitch-heading">Pitch deck</h3>
          <p>Our Space Apps pitch: the problem, the ARES approach and how the prototype works.</p>
          <a className="team-link" href={team.pitchDeckUrl} target="_blank" rel="noopener noreferrer"><MissionIcon name="sources" />Open the pitch deck<span className="visually-hidden"> (opens Figma in a new tab)</span></a>
        </section>
      </div>
    </div>
    <section className="team-card team-video" aria-labelledby="team-video-heading">
      <h3 id="team-video-heading">30-second team presentation</h3>
      {video === null
        ? <p className="team-video-pending" role="note"><MissionIcon name="play" />The presentation video is being edited and will appear here soon.</p>
        : /^\/(?!\/)/.test(video.src)
          ? <video controls preload="metadata" poster={video.poster} aria-label={video.title} width="1280" height="720">{video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}<source src={video.src} /></video>
          : <a className="team-link" href={video.src} target="_blank" rel="noopener noreferrer"><MissionIcon name="play" />Watch {video.title}<span className="visually-hidden"> (opens in a new tab)</span></a>}
    </section>
  </section>;
}

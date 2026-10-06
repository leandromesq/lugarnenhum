import Link from "next/link";

interface AnnouncementProps {
  text: string;
}

export function Announcement({ text }: AnnouncementProps) {
  return (
    <header className="announcement">
      <Link className="announcement__link" href="/musica" aria-label={text}>
        <span className="announcement__track" aria-hidden="true">
          {[0, 1].map((group) => (
            <span className="announcement__segment" key={group}>
              <span>{text}</span>
              <span>{text}</span>
            </span>
          ))}
        </span>
      </Link>
    </header>
  );
}

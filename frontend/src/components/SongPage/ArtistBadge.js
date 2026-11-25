import { NavLink } from 'react-router-dom';
import { DEFAULT_IMAGE_URL, fallbackToDefaultImage } from '../../utils';
import './ArtistBadge.css';

export default function ArtistBadge({ artist }) {
  
  
  return (
    <div className='artist_badge'>
      <NavLink to={`/users/${artist.id}`} onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })}>
        <img src={artist.profileImageURL || DEFAULT_IMAGE_URL}
          onError={fallbackToDefaultImage}
          alt='artist'
        />
      </NavLink>

      <div className='badge__info'>
        <NavLink to={`/users/${artist.id}`} onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })}>{artist.username}</NavLink>
        <span>
          <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSIyOCI+CiAgICA8cmVjdCB4PSI1IiB5PSIxMiIgZmlsbD0icmdiKDE1MywgMTUzLCAxNTMpIiB3aWR0aD0iMiIgaGVpZ2h0PSI0Ii8+CiAgICA8cmVjdCB4PSIyMSIgeT0iMTIiIGZpbGw9InJnYigxNTMsIDE1MywgMTUzKSIgd2lkdGg9IjIiIGhlaWdodD0iNCIvPgogICAgPHJlY3QgeD0iMTciIHk9IjEwIiBmaWxsPSJyZ2IoMTUzLCAxNTMsIDE1MykiIHdpZHRoPSIyIiBoZWlnaHQ9IjgiLz4KICAgIDxyZWN0IHg9IjkiIHk9IjgiIGZpbGw9InJnYigxNTMsIDE1MywgMTUzKSIgd2lkdGg9IjIiIGhlaWdodD0iMTIiLz4KICAgIDxyZWN0IHg9IjEzIiB5PSI1IiBmaWxsPSJyZ2IoMTUzLCAxNTMsIDE1MykiIHdpZHRoPSIyIiBoZWlnaHQ9IjE4Ii8+Cjwvc3ZnPgo="
            style={{ position: 'relative', bottom: '-8px' }}
            alt=''
          />
          &nbsp;{artist.Songs.length}
        </span>
      </div>

    </div>
  )
}

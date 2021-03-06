import CommentCard from '../CommentCard';
import './CommentSection.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faComment, faMessage } from '@fortawesome/free-solid-svg-icons';
import { useEffect } from 'react';
import { getTimeElapsed } from '../../utils';

export default function CommentSection({ comments }) {

  return !comments ? <small>seems lonely here... how about leaving a comment?</small> : (
    <div className='comment_section'>

      <span className='inner_section_header'>
        <FontAwesomeIcon icon={faMessage} style={{ color: '#b3b3b3', position: 'relative', bottom: '-1px' }}></FontAwesomeIcon>
        &nbsp;{comments.length === 1
          ? comments.length + ' comment'
          : comments.length + ' comments'}
      </span>

      <div className='comments'>
        {comments.map(comment => (
          <CommentCard key={comment.id} comment={comment} />
        ))}
      </div>


    </div>
  )
}

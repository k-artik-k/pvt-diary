import { useEffect, useRef, useState } from 'react';
import './PostActionsMenu.css';

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export default function PostActionsMenu({
  postId,
  shareUrl,
  canManage = false,
  isDraft = false,
  onEdit,
  onOrganize,
  onDuplicate,
  onToggleDraft,
  onDelete
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleCopy(event) {
    event.stopPropagation();
    await copyText(shareUrl || `${window.location.origin}/post/${postId}`);
    setCopied(true);
    setOpen(false);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleMenuToggle(event) {
    event.stopPropagation();
    setOpen((prev) => !prev);
  }

  function handleDeleteClick(event) {
    event.stopPropagation();
    setOpen(false);
    onDelete?.();
  }

  function handleMenuAction(event, action) {
    event.stopPropagation();
    setOpen(false);
    action?.();
  }

  return (
    <div className="post-actions-menu" ref={menuRef} onClick={(event) => event.stopPropagation()}>
      <button
        className={`post-actions-trigger ${open ? 'open' : ''}`}
        onClick={handleMenuToggle}
        title={copied ? 'Link copied' : 'Post actions'}
        aria-label="Post actions"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>

      {open && (
        <div className="post-actions-dropdown">
          {canManage && (
            <>
              <button className="post-actions-item" onClick={(event) => handleMenuAction(event, onEdit)}>
                Edit Post
              </button>
              <button className="post-actions-item" onClick={(event) => handleMenuAction(event, onOrganize)}>
                Move / Tags
              </button>
              <button className="post-actions-item" onClick={(event) => handleMenuAction(event, onDuplicate)}>
                Duplicate as Draft
              </button>
              <button className="post-actions-item" onClick={(event) => handleMenuAction(event, onToggleDraft)}>
                {isDraft ? 'Publish Post' : 'Mark as Draft'}
              </button>
              <div className="post-actions-divider" />
            </>
          )}
          <button className="post-actions-item" onClick={handleCopy}>
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          {canManage && (
            <button className="post-actions-item danger" onClick={handleDeleteClick}>
              Delete Post
            </button>
          )}
        </div>
      )}
    </div>
  );
}

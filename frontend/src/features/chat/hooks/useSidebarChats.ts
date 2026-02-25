import { useEffect } from 'react';
import type { ChatSession } from '@/features/chat/types/chat';

interface UseSidebarChatsParams {
  recentChats: ChatSession[];
  currentChatId: string;
  startNewChat: () => void;
  loadChat: (chatId: string) => void;
  requestDeleteChat: (chatId: string) => void;
  renameChat: (chatId: string) => void;
  togglePinChat: (chatId: string) => void;
  downloadSpecificChat: (chatId: string) => void;
}

const FLOATING_MENU_ID = 'chat-options-floating-menu';
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const useSidebarChats = ({
  recentChats,
  currentChatId,
  startNewChat,
  loadChat,
  requestDeleteChat,
  renameChat,
  togglePinChat,
  downloadSpecificChat
}: UseSidebarChatsParams) => {
  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 1024) {
      window.dispatchEvent(new CustomEvent('closeSidebarMobile'));
    }
  };

  useEffect(() => {
    const handleNewChat = () => {
      startNewChat();
      closeSidebarOnMobile();
    };

    window.addEventListener('startNewChat', handleNewChat);
    return () => {
      window.removeEventListener('startNewChat', handleNewChat);
    };
  }, [startNewChat]);

  useEffect(() => {
    const ensureFloatingMenu = () => {
      let menu = document.getElementById(FLOATING_MENU_ID) as HTMLElement | null;
      if (menu) return menu;

      menu = document.createElement('div');
      menu.id = FLOATING_MENU_ID;
      menu.className = 'hidden fixed w-56 studio-chat-menu z-[10000] overflow-hidden';
      document.body.appendChild(menu);
      return menu;
    };

    const closeFloatingMenu = () => {
      const menu = document.getElementById(FLOATING_MENU_ID) as HTMLElement | null;
      if (!menu) return;
      menu.classList.add('hidden');
      menu.innerHTML = '';
      menu.removeAttribute('data-chat-id');
      menu.removeAttribute('data-trigger-chat-id');
    };

    const menu = ensureFloatingMenu();

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isMenu = target.closest(`#${FLOATING_MENU_ID}`);
      const isTrigger = target.closest('.chat-options-trigger');
      if (!isMenu && !isTrigger) {
        closeFloatingMenu();
      }
    };

    const handleMenuAction = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const actionButton = target.closest('button[data-action]') as HTMLButtonElement | null;
      if (!actionButton) return;

      const action = actionButton.dataset.action;
      const chatId = (menu.getAttribute('data-chat-id') || '').trim();
      if (!chatId) return;

      if (action === 'download') window.dispatchEvent(new CustomEvent('downloadChat', { detail: chatId }));
      if (action === 'rename') window.dispatchEvent(new CustomEvent('renameChat', { detail: chatId }));
      if (action === 'pin') window.dispatchEvent(new CustomEvent('pinChat', { detail: chatId }));
      if (action === 'delete') window.dispatchEvent(new CustomEvent('deleteChat', { detail: chatId }));
      closeSidebarOnMobile();
      closeFloatingMenu();
    };

    const openFloatingMenu = (trigger: HTMLElement, chatId: string, pinned: boolean) => {
      const isOpen = !menu.classList.contains('hidden');
      const openChatId = (menu.getAttribute('data-chat-id') || '').trim();
      const openTriggerId = (menu.getAttribute('data-trigger-chat-id') || '').trim();
      if (isOpen && openChatId === chatId && openTriggerId === chatId) {
        closeFloatingMenu();
        return;
      }

      menu.setAttribute('data-chat-id', chatId);
      menu.setAttribute('data-trigger-chat-id', chatId);
      menu.innerHTML = `
        <div class="p-2">
          <button class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-150 flex items-center gap-3 rounded-lg" data-action="download">
            <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div class="text-white font-medium">Download</div>
          </button>
          <button class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-150 flex items-center gap-3 rounded-lg" data-action="rename">
            <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 4.487l2.651 2.651a2.121 2.121 0 010 3L7.5 22.15 3 21l1.15-4.5 12.712-12.713a2.121 2.121 0 013 0z"></path></svg>
            </div>
            <div class="text-white font-medium">Rename</div>
          </button>
          <button class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-150 flex items-center gap-3 rounded-lg" data-action="pin">
            <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 3l5 5-4 4 2 2-3 3-2-2-6 6-2-2 6-6-2-2 3-3 2 2 4-4z"></path></svg>
            </div>
            <div class="text-white font-medium">${pinned ? 'Unpin' : 'Pin'}</div>
          </button>
          <div class="h-px bg-white/10 mx-2 my-2"></div>
          <button class="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-all duration-150 flex items-center gap-3 rounded-lg" data-action="delete">
            <div class="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <svg class="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </div>
            <div class="text-white font-medium">Delete</div>
          </button>
        </div>
      `;
      menu.classList.remove('hidden');

      const triggerRect = trigger.getBoundingClientRect();
      const initialRect = menu.getBoundingClientRect();
      const maxAllowedWidth = Math.max(180, window.innerWidth - 16);
      const targetWidth = Math.min(initialRect.width || 224, maxAllowedWidth);
      menu.style.width = `${targetWidth}px`;

      const menuRect = menu.getBoundingClientRect();

      // Prefer opening to the right of the trigger, then clamp into viewport.
      const minLeft = 8;
      const maxLeft = Math.max(minLeft, window.innerWidth - menuRect.width - 8);
      let left = triggerRect.right + 8;
      left = Math.min(Math.max(left, minLeft), maxLeft);

      // On very small screens, align closer to trigger's left edge to avoid awkward overflow.
      if (window.innerWidth < 768) {
        left = Math.min(Math.max(triggerRect.left, minLeft), maxLeft);
      }

      const minTop = 8;
      const maxTop = Math.max(minTop, window.innerHeight - menuRect.height - 8);
      const belowTop = triggerRect.bottom + 8;
      const aboveTop = triggerRect.top - menuRect.height - 8;
      let top = belowTop;
      if (belowTop > maxTop) {
        top = aboveTop;
      }
      top = Math.min(Math.max(top, minTop), maxTop);

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    };

    (window as any).openFloatingChatMenu = openFloatingMenu;

    document.addEventListener('click', handleDocumentClick);
    menu.addEventListener('click', handleMenuAction as EventListener);

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      menu.removeEventListener('click', handleMenuAction as EventListener);
      delete (window as any).openFloatingChatMenu;
      closeFloatingMenu();
    };
  }, []);

  useEffect(() => {
    const container = document.getElementById('recent-chats-container');
    if (!container) return;

    container.innerHTML = '';
    if (recentChats.length === 0) {
      container.innerHTML = `
         <div class="glass-dark border border-white/10 rounded-xl p-6 text-center">
           <div class="text-blue-300 text-sm font-medium">No recent chats</div>
           <div class="text-blue-400 text-xs mt-1">Start a new conversation to see it here</div>
        </div>
      `;
      return;
    }

    const sortedChats = [...recentChats].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });

    sortedChats.forEach((chat) => {
      const chatElement = document.createElement('div');
      chatElement.className = `group relative studio-chat-card rounded-2xl p-4 cursor-pointer transition-all duration-300 ${chat.id === currentChatId ? 'studio-chat-card-active' : ''}`;

      const title = escapeHtml(chat.title || 'Untitled Chat');
      const date = escapeHtml(new Date(chat.lastModified).toLocaleDateString());
      const safeChatId = escapeHtml(chat.id);

      chatElement.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
             <div class="truncate text-white font-medium text-sm">${title}</div>
             <div class="text-xs text-blue-300 mt-1">${date}</div>
          </div>
           <div class="relative">
          <button 
               class="chat-options-trigger opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/20 transition-all duration-150"
               data-chat-options-trigger="${safeChatId}"
               data-chat-id="${safeChatId}"
             >
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
               </svg>
             </button>
           </div>
        </div>
      `;

      chatElement.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('button')) {
          loadChat(chat.id);
          closeSidebarOnMobile();
        }
      });

      const optionsButton = chatElement.querySelector('.chat-options-trigger') as HTMLElement | null;
      if (optionsButton) {
        optionsButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const openFloatingChatMenu = (window as any).openFloatingChatMenu as ((trigger: HTMLElement, chatId: string, pinned: boolean) => void) | undefined;
          if (openFloatingChatMenu) {
            openFloatingChatMenu(optionsButton, chat.id, !!chat.pinned);
          }
        });
      }

      container.appendChild(chatElement);
    });
  }, [recentChats, currentChatId, loadChat]);

  useEffect(() => {
    const handleDeleteChat = (event: Event) => {
      requestDeleteChat((event as CustomEvent).detail);
    };

    window.addEventListener('deleteChat', handleDeleteChat as EventListener);
    return () => {
      window.removeEventListener('deleteChat', handleDeleteChat as EventListener);
    };
  }, [requestDeleteChat]);

  useEffect(() => {
    const handleRenameChat = (event: Event) => {
      renameChat((event as CustomEvent).detail);
    };

    window.addEventListener('renameChat', handleRenameChat as EventListener);
    return () => {
      window.removeEventListener('renameChat', handleRenameChat as EventListener);
    };
  }, [renameChat]);

  useEffect(() => {
    const handlePinChat = (event: Event) => {
      togglePinChat((event as CustomEvent).detail);
    };

    window.addEventListener('pinChat', handlePinChat as EventListener);
    return () => {
      window.removeEventListener('pinChat', handlePinChat as EventListener);
    };
  }, [togglePinChat]);

  useEffect(() => {
    const handleDownloadChat = (event: Event) => {
      downloadSpecificChat((event as CustomEvent).detail);
    };

    window.addEventListener('downloadChat', handleDownloadChat as EventListener);
    return () => {
      window.removeEventListener('downloadChat', handleDownloadChat as EventListener);
    };
  }, [downloadSpecificChat]);
};

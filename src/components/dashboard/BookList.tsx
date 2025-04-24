'use client';

import { BookOrFolder, Folder } from '@/types';
import FolderCard from '@/components/dashboard/FolderCard';
import BookCard from './BookCard';


interface Props {
  items: BookOrFolder[];
  onFolderClick: (folderId: string) => void;
  folderId: string | null;
  parentFolderId?: string | null;
  parentFolderSlug?: string | null;
  refresh: () => void;
  breadcrumbs?: { id: string | null; name: string; slug: string | null }[];
  isRoot: boolean;
}

export default function BookList({ items, onFolderClick, folderId, parentFolderId, parentFolderSlug, refresh, breadcrumbs = [], isRoot }: Props) {
  const parentCrumb = breadcrumbs[breadcrumbs.length - 2];

  const goUpFolder: Folder & { isFolder: true } = {
    id: parentFolderId ?? 'null',
    name: '⬅️ Go Up',
    slug: parentFolderSlug ?? 'null',
    user_id: '',
    parent_id: null,
    isFolder: true,
    sort_order: -1,
  };

  const fullList: BookOrFolder[] = isRoot ? items : [goUpFolder, ...items];

  return (
    <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-4">
      {fullList.map((item) => {
        if (item.isFolder) {
          const folder = item as Folder;

          return (
            <FolderCard
              key={folder.id}
              folder={folder}
              onFolderClick={(id: string) => { 
                if (id === '__go_up__') {
                  if (parentCrumb) {
                    onFolderClick(parentCrumb.id || '');
                  }
                } else {
                  onFolderClick(id);
                }
              }}
              refresh={() => {
                if (folder.id === '__go_up__' && parentCrumb) {
                  refresh();
                } else {
                  refresh();
                }
              }}
            />
          );
        } else {
          return <BookCard key={item.id} book={item} refresh={refresh} folderId={folderId} parentFolderId={parentFolderId ?? null} />;
        }
      })}
    </div>
  );
}

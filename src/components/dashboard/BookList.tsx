'use client';

import { BookOrFolder, Folder } from '@/types';
import FolderCard from '@/components/FolderCard'; // Assuming the filename is lowercase
import BookCard from './BookCard';
import { getRootId } from '@/lib/supabase';


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
  const parentCrumb = breadcrumbs[breadcrumbs.length - 2]; // Previous folder in the breadcrumb trail

  // Explicitly type goUpFolder as Folder
  const goUpFolder: Folder & { isFolder: true } = {
    id: parentFolderId ?? 'null',
    name: '⬅️ Go Up',
    slug: parentFolderSlug ?? 'null',
    user_id: '',
    created_at: '',
    parent_id: null,
    isFolder: true, // Ensure this is explicitly true
  };

  const fullList: BookOrFolder[] = isRoot ? items : [goUpFolder, ...items];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {fullList.map((item) => {
        if (item.isFolder) {
          const folder = item as Folder;

          return ( // Add return statement here
            <FolderCard
              key={folder.id}
              folder={folder}
              onFolderClick={(id: string) => { // Add explicit type 'string' for id
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
                  console.log('Parent crumb:', parentCrumb);
                  refresh();
                } else {
                  refresh();
                }
              }}
            />
          ); // Keep this closing parenthesis for the return statement
        } else {
          return <BookCard key={item.id} book={item} refresh={refresh} folderId={folderId} parentFolderId={parentFolderId ?? null} />;
        }
      })}
    </div>
  );
}

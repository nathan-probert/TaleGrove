'use client';

import { useEffect, useState } from 'react';
import BookList from '@/components/dashboard/BookList';
import { BookOrFolder, Folder } from '@/types';
import { fetchUserBooksAndFolders } from '@/lib/getBooks';
import supabase, { createFolder } from '@/lib/supabase';
import Link from 'next/link';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useRouter } from 'next/navigation';

const slugify = (str: string) =>
    str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export default function Books() {
    const params = useParams();
    const slugArray = Array.isArray(params.slug) ? params.slug : params.slug ? [params.slug] : [];

    const [books, setBooks] = useState<BookOrFolder[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string, slug: string | null }[]>([
        { id: null, name: 'Home', slug: null }
    ]);

    const router = useRouter();

    const resolveFolderPath = async (userId: string, slugPath: string[]) => {
        let parentId: string | null = null;
        const crumbs: { id: string | null, name: string, slug: string | null }[] = [{ id: null, name: 'Home', slug: null }];

        for (const slug of slugPath) {
            const sanitizedParentId = parentId === 'null' ? null : parentId;
            console.log(`Resolving folder for slug: ${slug}, userId: ${userId}, parentId: ${sanitizedParentId}`);

            let query = supabase
                .from('folders')
                .select('id, name, slug')
                .eq('slug', slug)
                .eq('user_id', userId);

            if (sanitizedParentId === null) {
                query = query.is('parent_id', null);
            } else {
                query = query.eq('parent_id', sanitizedParentId);
            }

            const result = await query.single();

            console.log(result)

            const data = result.data as Pick<Folder, 'id' | 'name' | 'slug'> | null;
            const error = result.error;

            if (error || !data) {
                console.warn(`Folder not found for slug: ${slug}`);
                return { folderId: null, breadcrumbs: crumbs };
            }

            crumbs.push({ id: data.id, name: data.name, slug: data.slug });
            parentId = data.id;
        }

        return { folderId: parentId, breadcrumbs: crumbs };
    };

    const fetchData = async (userId: string, slugPath: string[]) => {
        setIsLoading(true);
        try {
            const { folderId, breadcrumbs } = await resolveFolderPath(userId, slugPath);
            if (slugPath.length && !folderId) {
                router.push('/books');
                return;
            }

            setCurrentFolderId(folderId);
            setBreadcrumbs(breadcrumbs);

            const combined = await fetchUserBooksAndFolders(userId, folderId);
            setBooks(combined);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/signin');
                    return;
                }
                setUserId(user.id);
                await fetchData(user.id, slugArray);
            } catch (error) {
                console.error("Auth Error:", error);
                router.push('/signin');
            }
        };

        initializeAuth();
    }, [slugArray.join('/')]);

    const handleFolderClick = (folderId: string) => {
        const clickedFolder = books.find(item => item.isFolder && item.id === folderId) as Folder | undefined;
        if (clickedFolder?.slug) {
            const newPath = [...slugArray, clickedFolder.slug].join('/');
            router.push(`/books/${newPath}`);
        } else {
            console.error(`Could not find slug for folder ID: ${folderId}`);
        }
    };

    const handleBreadcrumbClick = (crumb: { id: string | null, slug: string | null }) => {
        if (!userId) return;
        const index = breadcrumbs.findIndex(c => c.id === crumb.id);
        const path = breadcrumbs.slice(1, index + 1).map(c => c.slug).filter(Boolean).join('/');
        router.push(path ? `/books/${path}` : '/books');
    };

    const handleCreateFolder = async () => {
        if (!userId) {
            console.error("User not logged in");
            return;
        }

        const folderName = window.prompt("Enter new folder name:");
        if (!folderName?.trim()) return;

        const newSlug = slugify(folderName);
        setIsLoading(true);
        try {
            await createFolder(folderName, userId, currentFolderId);
            await fetchData(userId, slugArray);
        } catch (error) {
            console.error('Error creating folder:', error);
            alert(`Failed to create folder. ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    if (isLoading && !books.length) {
        return (
            <div>
                <h1 className="text-3xl font-bold mb-4">📚 Dashboard</h1>
                <h2>Loading...</h2>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div>
                <h1 className="text-3xl font-bold mb-4">📚 Dashboard</h1>

                <div className="mb-4 flex items-center space-x-4">
                    {/* Breadcrumbs */}
                    <div className="flex space-x-2 text-sm text-blue-600">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={crumb.id || 'home'}>
                                <button
                                    onClick={() => handleBreadcrumbClick(crumb)}
                                    className={`underline hover:text-blue-800 ${index === breadcrumbs.length - 1 ? 'font-semibold text-gray-800 no-underline' : ''}`}
                                    disabled={index === breadcrumbs.length - 1} // Disable click on current crumb
                                >
                                    {crumb.name}
                                </button>
                                {index < breadcrumbs.length - 1 && <span className="mx-1">/</span>}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 mb-6 flex space-x-4">
                    <button
                        onClick={handleCreateFolder}
                        disabled={isLoading}
                        className="inline-flex cursor-pointer justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        {isLoading ? 'Creating...' : 'Create Folder'}
                    </button>
                    <Link href="/search">
                        <button className="inline-flex cursor-pointer justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Search for Books
                        </button>
                    </Link>
                </div>

                {isLoading && <p>Refreshing...</p>}
                {!isLoading && books.length === 0 && (
                    <div className="text-center text-gray-500 mt-8">
                        <p>This folder is empty.</p>
                    </div>
                )}
                {/* Render BookList whether root or folder, passing currentFolderId (null at root) */}
                {!isLoading && (
                    <BookList
                        items={books}
                        onFolderClick={handleFolderClick}
                        folderId={currentFolderId}
                        refresh={() => {
                            if (userId) fetchData(userId, slugArray);
                        }}
                    />
                )}
            </div>
        </DndProvider>
    );
}

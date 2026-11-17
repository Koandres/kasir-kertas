import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout, { EmptyState, FormError, PageHeader } from '../../Components/Layout';
import Modal from '../../Components/Modal';

export default function CategoriesIndex({ categories }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const form = useForm({ name: '', sort_order: '0' });

    function create() {
        setEditing(null);
        form.setData({ name: '', sort_order: '0' });
        form.clearErrors();
        setOpen(true);
    }

    function edit(category) {
        setEditing(category);
        form.setData({ name: category.name, sort_order: String(category.sort_order) });
        form.clearErrors();
        setOpen(true);
    }

    function submit(event) {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset();
            },
        };

        if (editing) {
            form.put(`/kategori/${editing.id}`, options);
        } else {
            form.post('/kategori', options);
        }
    }

    function destroy(category) {
        if (window.confirm(`Hapus kategori ${category.name}?`)) {
            router.delete(`/kategori/${category.id}`, { preserveScroll: true });
        }
    }

    return (
        <AppLayout>
            <Head title="Kategori" />
            <PageHeader
                eyebrow="Katalog"
                title="Kategori"
                description="Urutan kategori menentukan susunan tab di layar kasir."
                actions={
                    <button type="button" className="btn btn-primary" onClick={create}>
                        Kategori baru
                    </button>
                }
            />

            <div className="panel max-w-3xl overflow-hidden">
                <table className="table-pos">
                    <thead>
                        <tr>
                            <th className="w-16 text-right">Urutan</th>
                            <th>Nama</th>
                            <th className="text-right">Produk</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan="4">
                                    <EmptyState title="Belum ada kategori">
                                        Kategori membantu kasir menyaring produk dengan cepat.
                                    </EmptyState>
                                </td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id}>
                                    <td className="money text-right text-muted">{category.sort_order}</td>
                                    <td className="font-semibold">{category.name}</td>
                                    <td className="money text-right">{category.products_count}</td>
                                    <td>
                                        <div className="flex justify-end gap-1">
                                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => edit(category)}>
                                                Ubah
                                            </button>
                                            <button type="button" className="btn btn-sm btn-ghost text-danger" onClick={() => destroy(category)}>
                                                Hapus
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Ubah kategori' : 'Kategori baru'}
                size="sm"
                footer={
                    <>
                        <button type="button" className="btn" onClick={() => setOpen(false)}>Batal</button>
                        <button type="submit" form="form-kategori" className="btn btn-primary" disabled={form.processing}>
                            Simpan
                        </button>
                    </>
                }
            >
                <form id="form-kategori" onSubmit={submit} className="space-y-4">
                    <div>
                        <label className="label" htmlFor="nama-kategori">Nama kategori</label>
                        <input id="nama-kategori" className="input" autoFocus value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                        <FormError message={form.errors.name} />
                    </div>
                    <div>
                        <label className="label" htmlFor="urutan-kategori">Urutan tampil</label>
                        <input id="urutan-kategori" className="input money" inputMode="numeric" value={form.data.sort_order} onChange={(event) => form.setData('sort_order', event.target.value.replace(/[^0-9]/g, ''))} />
                        <FormError message={form.errors.sort_order} />
                    </div>
                </form>
            </Modal>
        </AppLayout>
    );
}

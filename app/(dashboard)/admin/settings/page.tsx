'use client'

import React, { useState } from 'react'
import { uploadLogo } from '@/app/actions/settingsActions'
import { Upload, CheckCircle2, AlertCircle, Sun, Moon } from 'lucide-react'

export default function AdminSettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">System Branding</h2>
                <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Visual Identity Management</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LogoUploader
                    type="SYSTEM_LOGO_LIGHT"
                    title="Light Mode Logo"
                    description="Displayed on light backgrounds. Recommended: Dark or colored logo."
                    icon={<Sun className="w-4 h-4 text-warning" />}
                />
                <LogoUploader
                    type="SYSTEM_LOGO_DARK"
                    title="Dark Mode Logo"
                    description="Displayed on dark backgrounds. Recommended: White or light-colored logo."
                    icon={<Moon className="w-4 h-4 text-primary" />}
                />
            </div>
        </div>
    )
}

function LogoUploader({ type, title, description, icon }: { type: string, title: string, description: string, icon: React.ReactNode }) {
    const [isUploading, setIsUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [preview, setPreview] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setPreview(URL.createObjectURL(file))
        }
    }

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsUploading(true)
        setMessage(null)

        const formData = new FormData(e.currentTarget)
        formData.append('type', type)

        try {
            const result = await uploadLogo(formData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Logo updated successfully' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Upload failed' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Connection failure' })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
            <div className="card-body p-6">
                <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <h3 className="font-black text-sm uppercase tracking-tight">{title}</h3>
                </div>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-wider leading-relaxed mb-6">
                    {description}
                </p>

                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-base-300 rounded-xl p-6 hover:bg-base-200/50 transition-colors bg-base-200/20">
                        {preview ? (
                            <div className="mb-4 bg-base-300/30 p-4 rounded-lg flex items-center justify-center min-h-[80px] w-full">
                                <img src={preview} alt="Preview" className="h-12 object-contain" />
                            </div>
                        ) : (
                            <div className="w-12 h-12 bg-base-200 rounded-full flex items-center justify-center mb-4 text-base-content/20">
                                <Upload className="w-6 h-6" />
                            </div>
                        )}

                        <input
                            type="file"
                            name="file"
                            accept="image/*"
                            className="file-input file-input-bordered file-input-xs w-full max-w-xs font-bold uppercase tracking-widest text-[9px]"
                            onChange={handleFileChange}
                            required
                        />
                    </div>

                    {message && (
                        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'} text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            <span>{message.text}</span>
                        </div>
                    )}

                    <div className="card-actions justify-end pt-2">
                        <button
                            type="submit"
                            className="btn btn-primary btn-sm font-black uppercase tracking-widest text-[10px] h-9 min-h-9 px-6"
                            disabled={isUploading}
                        >
                            {isUploading ? <span className="loading loading-spinner loading-xs"></span> : 'Update Logo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

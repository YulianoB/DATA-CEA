'use client'
import { toast } from 'sonner'

export const mostrarExito  = (msg, opts) => toast.success(msg, opts)
export const mostrarInfo   = (msg, opts) => toast.message(msg, opts)
export const mostrarAlerta = (msg, opts) => toast.warning(msg, opts)
export const mostrarError  = (msg, opts) => toast.error(msg, opts)

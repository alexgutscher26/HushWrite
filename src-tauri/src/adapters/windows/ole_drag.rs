/*!
 * SOURCE OF TRUTH KEYWORDS: try_ole_drag, TextDataObject, DropSource, CF_UNICODETEXT, DoDragDrop
 * WHAT:  Windows OLE drag-and-drop text delivery fallback.
 * WHY:   Acts as a last-resort delivery path for sandboxed windows that reject clipboard paste, UIA, and SendInput.
 * WHERE: Adapters layer in `src-tauri/src/adapters/windows/ole_drag.rs`, called by Windows injector delivery tiers.
 */


#![cfg(target_os = "windows")]

use windows::core::{implement, Error, Result, HRESULT};
use windows::Win32::Foundation::{BOOL, E_NOTIMPL, E_UNEXPECTED};
use windows::Win32::System::Com::{
    IDataObject, IDataObject_Impl, IEnumFORMATETC, FORMATETC, STGMEDIUM, TYMED_HGLOBAL,
};
use windows::Win32::System::Memory::{GlobalAlloc, GlobalLock, GlobalUnlock, GMEM_MOVEABLE};
use windows::Win32::System::Ole::{DoDragDrop, IDropSource, IDropSource_Impl, DROPEFFECT_COPY};

const CF_UNICODETEXT: u16 = 13;

#[implement(IDataObject)]
struct TextDataObject {
    text: Vec<u16>,
}

impl IDataObject_Impl for TextDataObject_Impl {
    fn GetData(&self, format: *const FORMATETC) -> Result<STGMEDIUM> {
        if format.is_null() {
            return Err(Error::from(E_UNEXPECTED));
        }
        let format = unsafe { &*format };
        if format.cfFormat != CF_UNICODETEXT || format.tymed != TYMED_HGLOBAL.0 as u32 {
            return Err(Error::from(E_NOTIMPL));
        }

        let bytes = self.text.len() * std::mem::size_of::<u16>();
        let handle = unsafe { GlobalAlloc(GMEM_MOVEABLE, bytes)? };
        let destination = unsafe { GlobalLock(handle) } as *mut u16;
        if destination.is_null() {
            return Err(Error::from_win32());
        }
        unsafe {
            std::ptr::copy_nonoverlapping(self.text.as_ptr(), destination, self.text.len());
            let _ = GlobalUnlock(handle);
            return Ok(STGMEDIUM {
                tymed: TYMED_HGLOBAL.0 as u32,
                u: windows::Win32::System::Com::STGMEDIUM_0 { hGlobal: handle },
                pUnkForRelease: std::mem::ManuallyDrop::new(None),
            });
        }
    }

    fn GetDataHere(&self, _: *const FORMATETC, _: *mut STGMEDIUM) -> Result<()> { Err(Error::from(E_NOTIMPL)) }
    fn QueryGetData(&self, format: *const FORMATETC) -> HRESULT {
        if format.is_null() { return E_UNEXPECTED.into(); }
        let format = unsafe { &*format };
        if format.cfFormat == CF_UNICODETEXT && format.tymed == TYMED_HGLOBAL.0 as u32 { HRESULT(0) } else { E_NOTIMPL.into() }
    }
    fn GetCanonicalFormatEtc(&self, _: *const FORMATETC, _: *mut FORMATETC) -> HRESULT { E_NOTIMPL.into() }
    fn SetData(&self, _: *const FORMATETC, _: *const STGMEDIUM, _: BOOL) -> Result<()> { Err(Error::from(E_NOTIMPL)) }
    fn EnumFormatEtc(&self, _: u32) -> Result<IEnumFORMATETC> { Err(Error::from(E_NOTIMPL)) }
    fn DAdvise(&self, _: *const FORMATETC, _: u32, _: Option<&windows::Win32::System::Com::IAdviseSink>) -> Result<u32> { Err(Error::from(E_NOTIMPL)) }
    fn DUnadvise(&self, _: u32) -> Result<()> { Err(Error::from(E_NOTIMPL)) }
    fn EnumDAdvise(&self) -> Result<windows::Win32::System::Com::IEnumSTATDATA> { Err(Error::from(E_NOTIMPL)) }
}

#[implement(IDropSource)]
struct DropSource;

impl IDropSource_Impl for DropSource_Impl {
    fn QueryContinueDrag(&self, escape: BOOL, key_state: windows::Win32::System::SystemServices::MODIFIERKEYS_FLAGS) -> HRESULT {
        if escape.as_bool() { return HRESULT(0x0004_0101); }
        // Keep the drag alive until the left mouse button is released.
        if key_state.0 & 0x0001 == 0 { return HRESULT(0x0004_0100); }
        HRESULT(0)
    }
    fn GiveFeedback(&self, _: windows::Win32::System::Ole::DROPEFFECT) -> HRESULT {
        HRESULT(0x0004_0102)
    }
}

pub fn try_ole_drag(text: &str) -> bool {
    if text.is_empty() { return false; }
    let mut wide: Vec<u16> = text.encode_utf16().chain(std::iter::once(0)).collect();
    let data: IDataObject = TextDataObject { text: std::mem::take(&mut wide) }.into();
    let source: IDropSource = DropSource.into();
    let mut effect = windows::Win32::System::Ole::DROPEFFECT(0);
    unsafe { DoDragDrop(&data, &source, DROPEFFECT_COPY, &mut effect).is_ok() && effect == DROPEFFECT_COPY }
}

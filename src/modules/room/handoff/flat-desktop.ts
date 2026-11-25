// The desktop without the room around it: no WebGL, or the model failed to load. It opens as a plain full-screen page;
// leaving it shows the Projects button, which opens it again.
import { createDesktopRoot, getDesktop } from '../../../services/desktop-registry';
import type { RoomDesktop, RoomMountOptions } from '../../../services/desktop-registry';
import type { Lang } from '../../../types';
import { loadDesktop } from '../../../services/desktop.service';

export interface FlatDesktopHost {
  lang(): Lang;
  /** the desktop's mount options with this way out */
  mountOptions(onExit: RoomMountOptions['onExit']): RoomMountOptions;
  /** the page's own chrome steps aside for the desktop (true) or comes back (false) */
  chrome(open: boolean): void;
  /** the desktop module did not load */
  failed(): void;
}

export class FlatDesktop {
  private root: HTMLElement | null = null;

  constructor(private readonly host: FlatDesktopHost) {}

  /** Loads the desktop if need be and opens it; `then` runs once it is up (e.g. to open an app). */
  open(then?: (desk: RoomDesktop) => void): void {
    void loadDesktop().then((ok) => {
      const desk = getDesktop();
      if (!ok || !desk) {
        this.host.failed();
        return;
      }
      const root = this.root ?? this.mount(desk);
      root.style.display = '';
      this.host.chrome(true);
      desk.setLang(this.host.lang());
      desk.open({ noBoot: true, instant: true });
      then?.(desk);
    });
  }

  private mount(desk: RoomDesktop): HTMLElement {
    const root = createDesktopRoot();
    root.style.cssText = 'position:fixed;inset:0;z-index:40;overflow:hidden';
    desk.mount(
      root,
      this.host.mountOptions(() => {
        desk.close();
        root.style.display = 'none';
        this.host.chrome(false);
      }),
    );
    this.root = root;
    return root;
  }
}

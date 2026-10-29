import { signOut } from "../login/actions";

/** The round profile button. It opens a small sheet with the account's email and "Log out". */
export function ProfileButton({ email }: { email: string }) {
  return (
    <>
      <button
        type="button"
        popoverTarget="profile-sheet"
        aria-label="Your account"
        className="glass press inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full p-0 text-ink"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.5 17c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      <div
        id="profile-sheet"
        popover="auto"
        className="m-0 mx-auto mb-[calc(14px+env(safe-area-inset-bottom))] mt-auto w-[calc(100%-28px)] max-w-[480px] rounded-[26px] border border-white bg-white p-5 text-ink shadow-[0_20px_60px_rgba(11,26,20,0.25)] backdrop:bg-[rgba(11,26,20,0.3)]"
      >
        <p className="m-0 text-[13px] font-semibold text-faint">Signed in as</p>
        <p className="m-0 mt-0.5 break-all font-display text-[18px] font-bold">{email}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <form action={signOut}>
            <button className="press min-h-12 w-full cursor-pointer rounded-2xl bg-ink text-[15px] font-semibold text-white">Log out</button>
          </form>
          <button
            type="button"
            popoverTarget="profile-sheet"
            popoverTargetAction="hide"
            className="press min-h-12 cursor-pointer rounded-2xl border border-[rgba(11,26,20,0.14)] bg-transparent text-[15px] font-semibold text-ink"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

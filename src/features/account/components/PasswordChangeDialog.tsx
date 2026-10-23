import {useEffect, useId, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {useNavigate} from "react-router-dom";
import {apiAuthService} from "../../services/apiAuth.service";
import {ApiError} from "../../../shared/api/http";

export function PasswordChangeDialog({onClose}: {onClose: () => void}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const title = useId();
    const navigate = useNavigate();
    const submitting = useRef(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [uncertain, setUncertain] = useState(false);
    function markUncertain() {setUncertain(true);setCurrentPassword("");setNewPassword("");setConfirmation("");}
    useEffect(() => {
        const previous = document.activeElement;
        const element = dialog.current;
        const overflow = document.body.style.overflow;
        element?.showModal(); document.body.style.overflow = "hidden";
        return () => {element?.close(); document.body.style.overflow = overflow; if (previous instanceof HTMLElement && previous.isConnected) previous.focus();};
    }, []);
    async function submit() {
        if (submitting.current || uncertain) return;
        setError("");
        if (newPassword !== confirmation) {setError("A confirmação não corresponde à nova senha."); return;}
        submitting.current = true; setPending(true);
        try {
            await apiAuthService.changePassword(currentPassword, newPassword);
            setCurrentPassword(""); setNewPassword(""); setConfirmation("");
            navigate("/login", {replace: true});
        } catch (failure) {
            if (failure instanceof ApiError) {
                if (failure.status === 401 && failure.code === "INVALID_CREDENTIALS") {setError("Senha atual incorreta. Confira e tente novamente."); setCurrentPassword("");}
                else if (failure.status === 401) {navigate("/login", {replace: true});}
                else if (failure.status >= 500) {setError("Não foi possível confirmar a alteração. A senha pode ter sido alterada. Entre novamente antes de tentar outra vez."); markUncertain();}
                else setError(({403: "Sem autorização para alterar a senha.", 409: "Suas credenciais foram alteradas. Entre novamente antes de continuar.", 422: "Revise os campos: a nova senha deve conter de 12 a 1.024 caracteres.", 429: "Muitas tentativas. Aguarde antes de tentar novamente."} as Record<number,string>)[failure.status] ?? "Não foi possível alterar a senha.");
            } else {
                // Validation errors are safe to correct; transport failures have unknown outcomes.
                const validation = failure instanceof Error && (failure.message.startsWith("Informe a senha") || failure.message.startsWith("A nova senha"));
                setError(validation ? (failure as Error).message : "Falha de comunicação. Não foi possível confirmar a alteração. Entre novamente antes de tentar outra vez.");
                if (!validation) markUncertain();
            }
        } finally {submitting.current = false; setPending(false);}
    }
    const button = "rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50";
    return createPortal(<dialog ref={dialog} data-supplier-ui aria-labelledby={title} onCancel={event=>{event.preventDefault(); if (!submitting.current && !uncertain) onClose();}} className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl backdrop:bg-slate-950/60">
        <h2 id={title} className="text-xl font-semibold">Alterar senha</h2><p className="mt-2 text-sm text-slate-600">Após a alteração, todas as sessões serão encerradas. Você precisará entrar novamente.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <form className="mt-5 space-y-4" onSubmit={event=>{event.preventDefault(); void submit();}}>
            <fieldset disabled={pending || uncertain} className="space-y-4">
                {([{label:"Senha atual", value:currentPassword, update:setCurrentPassword, autocomplete:"current-password", min:1}, {label:"Nova senha", value:newPassword, update:setNewPassword, autocomplete:"new-password", min:12}, {label:"Confirmar nova senha", value:confirmation, update:setConfirmation, autocomplete:"new-password", min:12}]).map(field=><label key={field.label} className="block text-sm">{field.label}<input type="password" required minLength={field.min} maxLength={1024} autoComplete={field.autocomplete} value={field.value} onChange={event=>field.update(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"/></label>)}
                <p className="text-xs text-slate-500">Nova senha: de 12 a 1.024 caracteres.</p><button type="submit" aria-busy={pending} className={`${button} supplier-action--success`}>{pending ? "Alterando senha…" : "Confirmar alteração"}</button>
            </fieldset>
            {uncertain ? <button type="button" className={button} onClick={()=>{apiAuthService.endLocalSession(); navigate("/login",{replace:true});}}>Encerrar sessão e entrar novamente</button> : <button type="button" disabled={pending} className={button} onClick={onClose}>Cancelar</button>}
        </form>
    </dialog>, document.body);
}

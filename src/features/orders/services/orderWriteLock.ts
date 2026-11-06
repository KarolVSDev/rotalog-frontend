// IndexedDB serializa transações readwrite entre abas, inclusive em HTTP local.
// O banco contém apenas o mutex; pedidos e reservas continuam no localStorage.
export async function withOrderWriteLock<T>(write: () => T): Promise<T> {
    if (typeof indexedDB === "undefined") {
        if (navigator.locks) return navigator.locks.request("rotalog:supplier-orders-write", write);
        throw new Error("Não foi possível reservar com segurança neste navegador. Abra o portal em localhost ou HTTPS.");
    }
    return new Promise<T>((resolve, reject) => {
        const request = indexedDB.open("rotalog:supplier-order-locks", 1);
        request.onupgradeneeded = () => request.result.createObjectStore("writes");
        request.onerror = () => reject(new Error("Não foi possível abrir o controle de reservas. Verifique as permissões de armazenamento do navegador."));
        request.onblocked = () => reject(new Error("Controle de reservas bloqueado. Feche as outras abas do portal e tente novamente."));
        request.onsuccess = () => {
            const database = request.result;
            try {
                const transaction = database.transaction("writes", "readwrite");
                let result: T;
                let failure: unknown;
                let committed = false;
                // Só executa após adquirir a transação exclusiva. Não adicionar
                // awaits: leitura, validação e gravação precisam ser síncronas.
                transaction.objectStore("writes").get("orders").onsuccess = () => {
                    try { result = write(); committed = true; }
                    catch (error) { failure = error; transaction.abort(); }
                };
                transaction.oncomplete = () => { database.close(); resolve(result); };
                transaction.onabort = () => {
                    database.close();
                    // O commit é a gravação síncrona no localStorage. A transação
                    // é só um mutex: abortá-la depois não desfaz esse commit.
                    if (committed) resolve(result);
                    else reject(failure ?? new Error("Não foi possível concluir a reserva de estoque."));
                };
            } catch (error) { database.close(); reject(error); }
        };
    });
}

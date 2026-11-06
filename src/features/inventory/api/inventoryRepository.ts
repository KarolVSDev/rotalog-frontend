import {authenticatedRequest} from "../../services/apiAuth.service";
import {ApiError} from "../../../shared/api/http";
import {OffersRepository, type Offer, type Warehouse} from "../../products/api/offersRepository";

export type Inventory = {
    id:string; offer_id:string; warehouse_id:string; external_physical_quantity:number | null;
    external_sellable_quantity:number; rotalog_reserved_not_reflected_quantity:number;
    safety_stock_quantity:number; effective_sellable_quantity:number; version:number;
    source:string; external_version:string | null; freshness_state:string;
    source_observed_at:string; received_at:string; last_reconciled_at:string | null;
    demo_run_id:string; is_synthetic:true;
};
export type InventoryPage = {items:Inventory[]; total:number; page:number; page_size:number};
export type InventoryReferences = {warehouses:Warehouse[]; offers:Offer[]};
export type InventoryFilters = {warehouseId:string; offerId:string};
type Transport = <T>(path:string,options?:RequestInit)=>Promise<T>;
const maxQuantity=2_147_483_647;
export function stockQuantity(input:string):number {
    if(!/^\d+$/.test(input))throw new Error("Informe uma quantidade inteira não negativa.");
    const quantity=Number(input);
    if(!Number.isSafeInteger(quantity)||quantity<0||quantity>maxQuantity)throw new Error("Informe uma quantidade entre 0 e 2147483647.");
    return quantity;
}
export function adjustmentValues(item:Inventory,sellable:string,safety:string,reason:string) {
    const external_sellable_quantity=stockQuantity(sellable);
    const safety_stock_quantity=stockQuantity(safety);
    const trimmed=reason.trim();
    if(trimmed.length<5||trimmed.length>500)throw new Error("A justificativa deve conter entre 5 e 500 caracteres.");
    if(external_sellable_quantity<item.rotalog_reserved_not_reflected_quantity+safety_stock_quantity)throw new Error("O vendável deve preservar as reservas existentes e o estoque de segurança.");
    return {offer_id:item.offer_id,warehouse_id:item.warehouse_id,external_sellable_quantity,safety_stock_quantity,expected_version:item.version,reason:trimmed};
}
export function inventoryError(error:unknown):string {
    if(error instanceof ApiError) {
        const codes:Record<string,string>={INVENTORY_BELOW_RESERVED:"O ajuste não pode consumir as reservas ou o estoque de segurança.",VERSION_CONFLICT:"O estoque foi alterado. Atualize os saldos e revise novamente.",INVENTORY_NOT_FOUND:"Estoque não encontrado para esta organização.",WAREHOUSE_NOT_FOUND:"Depósito não encontrado ou inativo para esta organização."};
        const statuses:Record<number,string>={401:"Sessão expirada. Entre novamente.",403:"Sem permissão para consultar ou ajustar este estoque.",404:"Estoque, oferta ou depósito não encontrado para esta organização.",409:"Conflito de versão ou limite de estoque. Atualize os saldos e revise a operação.",422:"Quantidades ou justificativa inválidas. Revise os dados."};
        const message=codes[error.code ?? ""] ?? statuses[error.status] ?? "Não foi possível confirmar o resultado no servidor. Consulte os saldos antes de tentar novamente.";
        return `${message}${error.requestId ? ` Referência: ${error.requestId}.` : ""}`;
    }
    return error instanceof Error ? error.message : "Não foi possível consultar o estoque.";
}
export class InventoryRepository {
    private organizationId:string;
    private transport:Transport;
    private references:InventoryReferences | null=null;
    private snapshots=new Map<string,Inventory>();
    private pending=false;
    constructor(organizationId:string,transport:Transport=authenticatedRequest) {this.organizationId=organizationId;this.transport=transport;}
    private options():RequestInit {
        if(!this.organizationId)throw new Error("Organização autenticada indisponível.");
        return {headers:{"X-Organization-Id":this.organizationId}};
    }
    async loadReferences():Promise<InventoryReferences> {
        this.references=null;
        const repository=new OffersRepository(this.organizationId,this.transport);
        const [warehouses,offers]=await Promise.all([repository.warehouses(),(async()=>{
            const result:Offer[]=[];
            let page=1,total:number | undefined;
            do {
                const response=await repository.offers(page);
                if(response.page!==page||response.page_size!==25||!Number.isSafeInteger(response.total)||response.total<0||(total!==undefined&&total!==response.total))throw new Error("A listagem de ofertas mudou. Atualize a consulta.");
                total=response.total;result.push(...response.items);
                if(result.length>total||(!response.items.length&&result.length<total)||new Set(result.map(item=>item.id)).size!==result.length)throw new Error("Paginação de ofertas inconsistente.");
                page++;
            } while(result.length<total);
            return result;
        })()]);
        this.references={warehouses,offers};
        return this.references;
    }
    private validate(value:unknown):Inventory {
        if(!value||typeof value!=="object")throw new Error("Resposta de estoque inválida.");
        const item=value as Inventory;
        if(![item.id,item.offer_id,item.warehouse_id,item.source,item.freshness_state,item.received_at,item.source_observed_at,item.demo_run_id].every(field=>typeof field==="string"&&field.length>0)||!Number.isSafeInteger(item.version)||item.version<1)throw new Error("Resposta de estoque incompleta ou inválida.");
        const quantities=[item.external_sellable_quantity,item.rotalog_reserved_not_reflected_quantity,item.safety_stock_quantity,item.effective_sellable_quantity];
        if(item.external_physical_quantity!==null)quantities.push(item.external_physical_quantity);
        if(!quantities.every(quantity=>Number.isSafeInteger(quantity)&&quantity>=0&&quantity<=maxQuantity))throw new Error("Quantidades inválidas na resposta de estoque.");
        const warehouse=this.references?.warehouses.find(row=>row.id===item.warehouse_id&&row.supplier_organization_id===this.organizationId);
        if(!warehouse)throw new Error("O estoque referencia um depósito não autorizado para esta organização.");
        const offer=this.references?.offers.find(row=>row.id===item.offer_id);
        if(offer&&(offer.supplier_organization_id!==this.organizationId||offer.warehouse_id!==item.warehouse_id))throw new Error("Associação de oferta e depósito inconsistente.");
        return item;
    }
    async list(page:number,filters:InventoryFilters):Promise<InventoryPage> {
        if(!this.references)throw new Error("Consulte os depósitos e ofertas antes do estoque.");
        if(filters.warehouseId&&!this.references.warehouses.some(item=>item.id===filters.warehouseId))throw new Error("Depósito não autorizado.");
        if(filters.offerId&&!this.references.offers.some(item=>item.id===filters.offerId)&&![...this.snapshots.values()].some(item=>item.offer_id===filters.offerId))throw new Error("Oferta não autorizada para o filtro.");
        const query=new URLSearchParams({page:String(page),page_size:"25"});
        if(filters.warehouseId)query.set("warehouse_id",filters.warehouseId);
        if(filters.offerId)query.set("offer_id",filters.offerId);
        const response=await this.transport<InventoryPage>(`/api/v1/inventory?${query}`,this.options());
        if(!response||!Array.isArray(response.items)||response.page!==page||response.page_size!==25||!Number.isSafeInteger(response.total)||response.total<0||response.items.length>25||response.items.length>response.total)throw new Error("Paginação de estoque inválida.");
        const items=response.items.map(item=>this.validate(item));
        if(new Set(items.map(item=>item.id)).size!==items.length||items.some(item=>(filters.warehouseId&&item.warehouse_id!==filters.warehouseId)||(filters.offerId&&item.offer_id!==filters.offerId)))throw new Error("Resposta de estoque não corresponde aos filtros solicitados.");
        items.forEach(item=>this.snapshots.set(item.id,item));
        return {...response,items};
    }
    async adjust(item:Inventory,sellable:string,safety:string,reason:string):Promise<Inventory> {
        this.validate(item);
        if(this.snapshots.get(item.id)!==item)throw new Error("Atualize o estoque antes de revisar outro ajuste.");
        if(!this.references?.warehouses.some(warehouse=>warehouse.id===item.warehouse_id&&warehouse.is_active))throw new Error("O depósito precisa estar ativo para ajuste.");
        const body=adjustmentValues(item,sellable,safety,reason);
        if(this.pending)throw new Error("Já existe um ajuste em andamento.");
        this.pending=true;
        const options=this.options();
        try {
            const result=this.validate(await this.transport<Inventory>("/api/v1/inventory/manual-adjustments",{...options,method:"POST",headers:{...options.headers,"Content-Type":"application/json"},body:JSON.stringify(body)}));
            if(result.id!==item.id||result.offer_id!==item.offer_id||result.warehouse_id!==item.warehouse_id||result.version<=item.version||result.external_sellable_quantity!==body.external_sellable_quantity||result.safety_stock_quantity!==body.safety_stock_quantity)throw new Error("Resposta inesperada do ajuste. Consulte os saldos para confirmar o resultado.");
            this.snapshots.delete(item.id);
            return result;
        } catch(error) {
            // A new explicit GET and review are required, including after uncertain results.
            this.snapshots.delete(item.id);
            throw error;
        } finally {this.pending=false;}
    }
}

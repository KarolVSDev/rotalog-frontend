import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function setup(page:Page) {
    const state={posts:0,refreshes:0,status:204,code:'',network:false,delay:0};
    const user={id:'account-user',name:'Fornecedor de teste',email:'supplier@example.invalid',role:'SUPPLIER_OPERATOR',organization_id:'org',organizations:[{id:'org',name:'Organização teste',role:'SUPPLIER_OPERATOR'}],capabilities:['supplier_order:manage','offer:write','inventory:write'],demo_run_id:'demo',is_synthetic:true};
    await page.addInitScript(()=>sessionStorage.setItem('rotalog:api-csrf','csrf'));
    await page.route('http://localhost:8000/api/v1/**',async route=>{
        const path=new URL(route.request().url()).pathname;
        if(path.endsWith('/auth/refresh')) {state.refreshes++;return route.fulfill({json:{access_token:'access',expires_in:600,csrf_token:'csrf',refresh_token:null,user}});}
        if(path.endsWith('/me'))return route.fulfill({json:user});
        expect(route.request().headers().authorization).toBe('Bearer access');
        if(path.endsWith('/auth/password/change')) {
            state.posts++;
            expect(route.request().method()).toBe('POST');
            expect(Object.keys(route.request().postDataJSON()).sort()).toEqual(['current_password','new_password']);
            if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
            if(state.network)return route.abort('failed');
            return state.status===204?route.fulfill({status:204}):route.fulfill({status:state.status,json:{error:{code:state.code}}});
        }
        if(path==='/api/v1/supplier-orders')return route.fulfill({json:{items:[],total:0,page:1,page_size:100}});
        throw new Error('Unexpected endpoint');
    });
    await page.goto('/fornecedor/conta');
    return state;
}
async function form(page:Page) {
    await page.getByRole('button',{name:'Alterar senha',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Alterar senha'});
    await dialog.getByLabel('Senha atual',{exact:true}).fill('synthetic-current');
    await dialog.getByLabel('Nova senha',{exact:true}).fill('synthetic-new-password');
    await dialog.getByLabel('Confirmar nova senha',{exact:true}).fill('synthetic-new-password');
    return dialog;
}
test('alteração confirmada limpa sessão e encaminha ao login sem POST extra',async({page})=>{
    const state=await setup(page);state.delay=300;
    const dialog=await form(page);
    await dialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();
    await expect(dialog.getByRole('button',{name:'Alterando senha…'})).toBeDisabled();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('status')).toContainText('Senha alterada com sucesso');
    expect(await page.evaluate(()=>sessionStorage.getItem('rotalog:api-csrf'))).toBeNull();
    expect(state.posts).toBe(1);expect(state.refreshes).toBe(1);
});
test('validação e senha atual incorreta não encerram sessão nem repetem operação',async({page})=>{
    const state=await setup(page);state.status=401;state.code='INVALID_CREDENTIALS';
    const dialog=await form(page);
    await dialog.getByLabel('Confirmar nova senha',{exact:true}).fill('synthetic-other-password');
    await dialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();
    await expect(dialog.getByRole('alert')).toContainText('confirmação');expect(state.posts).toBe(0);
    await dialog.getByLabel('Confirmar nova senha',{exact:true}).fill('synthetic-new-password');
    await dialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();
    await expect(dialog.getByRole('alert')).toContainText('Senha atual incorreta');
    await expect(page).toHaveURL(/\/fornecedor\/conta$/);expect(state.posts).toBe(1);expect(state.refreshes).toBe(1);
    expect(await page.evaluate(()=>sessionStorage.getItem('rotalog:api-csrf'))).toBe('csrf');
});
test('sessão inválida é diferente de senha incorreta',async({page})=>{
    const state=await setup(page);state.status=401;state.code='INVALID_SESSION';
    const dialog=await form(page);await dialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();
    await expect(page).toHaveURL(/\/login$/);expect(state.posts).toBe(1);expect(state.refreshes).toBe(1);
    expect(await page.evaluate(()=>sessionStorage.getItem('rotalog:api-csrf'))).toBeNull();
});
for(const failure of ['network','server'] as const) test(`resultado incerto (${failure}) bloqueia nova alteração até novo login`,async({page})=>{
    const state=await setup(page);state.network=failure==='network';state.status=500;
    const dialog=await form(page);await dialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();
    await expect(dialog.getByRole('alert')).toContainText('Entre novamente');
    await expect(dialog.getByRole('button',{name:'Confirmar alteração',exact:true})).toBeDisabled();
    expect(state.posts).toBe(1);expect(state.refreshes).toBe(1);
    await dialog.getByRole('button',{name:'Encerrar sessão e entrar novamente'}).click();
    await expect(page).toHaveURL(/\/login$/);expect(state.posts).toBe(1);
});
test('formulário móvel acessível, cancelamento descarta somente por ação explícita',async({page},testInfo)=>{
    await page.setViewportSize({width:390,height:900});const state=await setup(page);
    const dialog=await form(page);
    await expect(page.getByRole('main').getByRole('textbox')).toHaveCount(0);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
    await page.screenshot({path:testInfo.outputPath('password-dialog-mobile.png')});
    await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();
    await expect(page.getByRole('button',{name:'Alterar senha',exact:true})).toBeFocused();
    expect(state.posts).toBe(0);
});

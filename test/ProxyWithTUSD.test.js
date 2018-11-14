import assertRevert from './helpers/assertRevert'
import expectThrow from './helpers/expectThrow'
import burnableTokenWithBoundsTests from './BurnableTokenWithBounds'
import basicTokenTests from './token/BasicToken';
import standardTokenTests from './token/StandardToken';
import burnableTokenTests from './token/BurnableToken';
import compliantTokenTests from './CompliantToken';
import tokenWithFeesTests from './TokenWithFees';
const Registry = artifacts.require("Registry")
const TrueUSD = artifacts.require("TrueUSD")
const TrueUSDMock = artifacts.require("TrueUSDMock")
const BalanceSheet = artifacts.require("BalanceSheet")
const AllowanceSheet = artifacts.require("AllowanceSheet")
const ForceEther = artifacts.require("ForceEther")
const GlobalPause = artifacts.require("GlobalPause")
const TusdProxy = artifacts.require("OwnedUpgradeabilityProxy")
// import burnableTokenWithBoundsTests from './BurnableTokenWithBounds'
// import basicTokenTests from './token/BasicToken';
// import standardTokenTests from './token/StandardToken';
// import burnableTokenTests from './token/BurnableToken';
// import compliantTokenTests from './CompliantToken';
// import tokenWithFeesTests from './TokenWithFees';


contract('Proxy', function (accounts) {
    const [_, owner, oneHundred, anotherAccount] = accounts
    const notes = "some notes"

    describe('--Set up proxy--', function () {
        beforeEach(async function () {
            this.registry = await Registry.new({ from: owner })
            this.proxy = await TusdProxy.new({ from: owner })
            this.implementation = await TrueUSD.new({ from: owner })
            this.globalPause = await GlobalPause.new({ from: owner })
            this.token = await TrueUSD.at(this.proxy.address)
            this.balanceSheet = await BalanceSheet.new({ from: owner })
            this.allowanceSheet = await AllowanceSheet.new({ from: owner })
            await this.balanceSheet.transferOwnership(this.token.address,{ from: owner })
            await this.allowanceSheet.transferOwnership(this.token.address,{ from: owner })
            await this.proxy.upgradeTo(this.implementation.address,{ from: owner })
            await this.registry.setAttribute(oneHundred, "hasPassedKYC/AML", 1, "notes", { from: owner })
            await this.registry.setAttribute(oneHundred, "canBurn", 1, "notes", { from: owner })
        })

        it('initializes proxy/tusd contract', async function(){
            await this.token.initialize(0,{from: owner})
            const tokenOwner = await this.token.owner()
            assert.equal(tokenOwner, owner)
            const burnMin = await this.token.burnMin()
            assert.equal(Number(burnMin), 10000*10**18)
            const burnMax = await this.token.burnMax()
            assert.equal(Number(burnMax), 20000000*10**18)
        })

        it('cannot initialize a second time', async function(){
            await this.token.initialize(0,{from: owner})
            await assertRevert(this.token.initialize(0, {from: owner}))
        })

        describe('---Tusd setup functions---', function(){
            beforeEach(async function () {
                await this.token.initialize(0, {from: owner})
            })

            it ('set globalPause contract', async function(){
                await this.token.setGlobalPause(this.globalPause.address, { from: owner }) 
            })

            it ('set storage contract', async function(){
                await this.token.setBalanceSheet(this.balanceSheet.address, { from: owner })
                await this.token.setAllowanceSheet(this.allowanceSheet.address, { from: owner })   
            })

            it ('set registry', async function(){
                await this.token.setRegistry(this.registry.address, { from: owner }) 
            })

            it ('sets staking fees', async function(){
                await this.token.changeStakingFees(0,1000,0,1000,0,0,1000,0, {from: owner})                
            })

            it('trueUSD does not accept ether', async function(){
                await assertRevert(this.token.sendTransaction({from: owner, gas: 600000, value: 1000}));                  
                const balanceWithEther = web3.fromWei(web3.eth.getBalance(this.token.address), 'ether').toNumber()
                assert.equal(balanceWithEther, 0)
            })
        })
        describe('---Tusd token functions---', function(){
            beforeEach(async function () {
                await this.token.initialize(0, {from: owner})
                await this.token.setGlobalPause(this.globalPause.address, { from: owner }) 
                await this.token.setBalanceSheet(this.balanceSheet.address, { from: owner })
                await this.token.setAllowanceSheet(this.allowanceSheet.address, { from: owner })   
                await this.token.setRegistry(this.registry.address, { from: owner }) 
                await this.token.changeStakingFees(0,1000,0,1000,0,0,1000,0, {from: owner})                
                await this.token.mint(oneHundred, 100*10**18, {from: owner})
            })
            it('proxy return totalSupply', async function(){
                await this.token.totalSupply()
            })    

            it('can transfer token', async function(){
                await this.token.transfer(anotherAccount,10*10**18, {from: oneHundred})
            }) 

            basicTokenTests([owner, oneHundred, anotherAccount])
            // standardTokenTests([owner, oneHundred, anotherAccount])

        })
    })
})

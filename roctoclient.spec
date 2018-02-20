# -*- mode: python -*-

block_cipher = None


a = Analysis(['rocto_client\\__main__.py'],
             pathex=['C:\\Users\\erikj\\AppData\\Local\\Programs\\Python\\Python36\\Lib\\site-packages\\PyQt5\\Qt\\bin', 'C:\\Users\\erikj\\Documents\\2-Projects\\rocto\\rocto-client'],
             binaries=[],
             datas=[],
             hiddenimports=[],
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          name='roctoclient',
          debug=False,
          strip=False,
          upx=True,
          runtime_tmpdir=None,
          console=False , icon='..\\rocto-design\\rocto_icon.ico')

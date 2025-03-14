#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import subprocess
import zipfile
import json
import shutil
from pathlib import Path

def get_version():
    """Get version number from package.json"""
    with open('package.json', 'r', encoding='utf-8') as f:
        package_data = json.load(f)
    return package_data.get('version', '0.0.0')

def create_directory(path):
    """Create directory (do nothing if it already exists)"""
    os.makedirs(path, exist_ok=True)
    print(f"Directory created: {path}")
    
    # Create a .gitkeep file to ensure the directory is included in ZIP
    gitkeep_file = os.path.join(path, '.gitkeep')
    with open(gitkeep_file, 'w') as f:
        f.write('# This file ensures the directory is included in ZIP archives\n')
    print(f"Created placeholder file: {gitkeep_file}")

def zip_directory(source_dir, output_filename):
    """Compress directory to ZIP"""
    abs_source = os.path.abspath(source_dir)
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # First, add all files
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                abs_file = os.path.join(root, file)
                arcname = os.path.relpath(abs_file, abs_source)
                print(f"Adding to ZIP: {arcname}")
                zipf.write(abs_file, arcname)
            
            # Explicitly add empty directories (though they should have .gitkeep files now)
            for dir in dirs:
                dir_path = os.path.join(root, dir)
                arcname = os.path.relpath(dir_path, abs_source) + '/'
                if not os.listdir(dir_path):  # Check if directory is empty
                    print(f"Adding empty directory to ZIP: {arcname}")
                    zipinfo = zipfile.ZipInfo(arcname)
                    zipinfo.external_attr = 0o40775 << 16  # Unix directory permissions
                    zipf.writestr(zipinfo, '')
    
    print(f"ZIP file created: {output_filename}")

def zip_file(source_file, output_filename):
    """Compress file to ZIP"""
    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        arcname = os.path.basename(source_file)
        zipf.write(source_file, arcname)
    print(f"ZIP file created: {output_filename}")

def run_build():
    """Run npm build command"""
    print("Running npm run build...")
    # Use shell=True to ensure npm command is found in PATH
    subprocess.run('npm run build', shell=True, check=True)
    print("Build completed")

def process_windows(version):
    """Post-build processing for Windows"""
    print("Executing post-build tasks for Windows...")
    
    # Create effetune_settings folder in win-unpacked directory
    settings_dir = os.path.join('dist', 'win-unpacked', 'effetune_settings')
    create_directory(settings_dir)
    
    # Compress win-unpacked folder to ZIP
    portable_zip = os.path.join('dist', f'EffeTune-{version}-Portable.zip')
    zip_directory(os.path.join('dist', 'win-unpacked'), portable_zip)
    
    # Compress Setup.exe to ZIP
    setup_exe = os.path.join('dist', f'EffeTune-{version}-Setup.exe')
    setup_zip = os.path.join('dist', f'EffeTune-{version}-Setup.zip')
    if os.path.exists(setup_exe):
        zip_file(setup_exe, setup_zip)
    else:
        print(f"Warning: {setup_exe} not found")

def process_macos(version):
    """Post-build processing for macOS"""
    print("Executing post-build tasks for macOS...")
    
    # Create effetune_settings folder in mac-unpacked directory (if it exists)
    mac_unpacked = os.path.join('dist', 'mac-unpacked')
    if os.path.exists(mac_unpacked):
        settings_dir = os.path.join(mac_unpacked, 'effetune_settings')
        create_directory(settings_dir)
        
        # Compress mac-unpacked folder to ZIP
        portable_zip = os.path.join('dist', f'EffeTune-{version}-Portable.zip')
        zip_directory(mac_unpacked, portable_zip)
    
    # Compress DMG file to ZIP
    dmg_file = os.path.join('dist', f'EffeTune-{version}.dmg')
    if os.path.exists(dmg_file):
        dmg_zip = os.path.join('dist', f'EffeTune-{version}-DMG.zip')
        zip_file(dmg_file, dmg_zip)
    else:
        print(f"Warning: {dmg_file} not found")

def process_linux(version):
    """Post-build processing for Linux"""
    print("Executing post-build tasks for Linux...")
    
    # Create effetune_settings folder in linux-unpacked directory (if it exists)
    linux_unpacked = os.path.join('dist', 'linux-unpacked')
    if os.path.exists(linux_unpacked):
        settings_dir = os.path.join(linux_unpacked, 'effetune_settings')
        create_directory(settings_dir)
        
        # Compress linux-unpacked folder to ZIP
        portable_zip = os.path.join('dist', f'EffeTune-{version}-Portable.zip')
        zip_directory(linux_unpacked, portable_zip)
    
    # Compress AppImage file to ZIP
    appimage_file = os.path.join('dist', f'EffeTune-{version}.AppImage')
    if os.path.exists(appimage_file):
        appimage_zip = os.path.join('dist', f'EffeTune-{version}-AppImage.zip')
        zip_file(appimage_file, appimage_zip)
    else:
        print(f"Warning: {appimage_file} not found")

def main():
    """Main process"""
    # Change current directory to the parent directory of the script (project root)
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Get version number
    version = get_version()
    print(f"EffeTune version: {version}")
    
    # Run build
    run_build()
    
    # Post-build processing based on OS
    if sys.platform.startswith('win'):
        process_windows(version)
    elif sys.platform.startswith('darwin'):
        process_macos(version)
    elif sys.platform.startswith('linux'):
        process_linux(version)
    else:
        print(f"Unsupported platform: {sys.platform}")
        sys.exit(1)
    
    print("All tasks completed")

if __name__ == "__main__":
    main()
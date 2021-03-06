import ConfigParser
import json
import os
import string
import code
import readline
import rlcompleter

from conf import settings

from keystoneclient.v3 import client

from fabric.api import task
from fabric.tasks import Task
from fabric.state import env
from fabric.api import execute

def _register_user(keystone, name, activate=True):
    email = name + '@test.com'
    user = keystone.user_registration.users.register_user(
        name=email,
        password='test',
        username=name,
        domain=settings.KEYSTONE_DEFAULT_DOMAIN)
    if activate:
        user = keystone.user_registration.users.activate_user(
            user=user.id,
            activation_key=user.activation_key)
    return user

def _create_organization(keystone, org_name):
    org = keystone.projects.create(
        name=org_name,
        description=('Test '+org_name),
        domain=settings.KEYSTONE_DEFAULT_DOMAIN,
        enabled=True,
        img='/static/dashboard/img/logos/small/group.png',
        city='',
        email='',
        website='')
    return org

@task
def test_data(keystone_path=settings.KEYSTONE_ROOT):
    """Populate the database with some users, organizations and applications
    for convenience"""

    # Log as idm
    config = ConfigParser.ConfigParser()
    config.read(keystone_path + 'etc/keystone.conf')
    admin_port = config.get('DEFAULT', 'admin_port')
    endpoint = 'http://{ip}:{port}/v3'.format(ip='127.0.0.1',
                                              port=admin_port)
    keystone = client.Client(
        username=settings.IDM_USER_CREDENTIALS['username'],
        password=settings.IDM_USER_CREDENTIALS['password'],
        project_name=settings.IDM_USER_CREDENTIALS['project'],
        auth_url=endpoint)

    # Create some default apps to test
    for app_name in settings.FIWARE_DEFAULT_APPS:
        app = keystone.oauth2.consumers.create(
            app_name,
            description='Default app in FIWARE',
            grant_type='authorization_code',
            client_type='confidential')
        # Create default roles
        for role_name in settings.FIWARE_DEFAULT_APPS[app_name]:
            keystone.fiware_roles.roles.create(
                name=role_name,
                is_internal=False,
                application=app.id)

    owner_role = keystone.roles.find(name='owner')

    # Create 10 users
    users = []
    for i in range(10):
        username = 'user'
        users.append(_register_user(keystone, username + str(i)))

    # Register pepProxy user

    pep_user = _register_user(keystone, 'pepproxy')

    # Create Franchises

    franchises = []

    for i in range(4):
        franchises.append(_create_organization(keystone, 'Franchise' + str(i+1)))


    for franchise in franchises:
        keystone.roles.grant(user=pep_user.id,
                         role=owner_role.id,
                         project=franchise.id)

    # Create Devguide APP and give provider role to the pepProxy
    # TODO: modify the url + callback when the app is ready
    devguide_app = keystone.oauth2.consumers.create(
        name='FIWAREdevGuide',
        redirect_uris=['http://compose_devguide_1/login'],
        description='Fiware devGuide Test Application',
        scopes=['all_info'],
        client_type='confidential',
        grant_type='authorization_code',
        url='http://compose_devguide_1',
        img='/static/dashboard/img/logos/small/app.png')
    provider_role = next(r for r
                         in keystone.fiware_roles.roles.list()
                         if r.name == 'provider')

    keystone.fiware_roles.roles.add_to_user(
        role=provider_role.id,
        user=pep_user.id,
        application=devguide_app.id,
        organization=pep_user.default_project_id)

    # Creating roles

    # End user
    end_user = keystone.fiware_roles.roles.create(
        name='End user',
        is_internal=False,
        application=devguide_app.id)

    # Franchise manager
    franchise_manager = keystone.fiware_roles.roles.create(
        name='Franchise manager',
        is_internal=False,
        application=devguide_app.id)

    # Global manager
    global_manager = keystone.fiware_roles.roles.create(
        name='Global manager',
        is_internal=False,
        application=devguide_app.id)


    # Make all users Restaurant viewers

    for user in users:
        keystone.fiware_roles.roles.add_to_user(
            role=end_user.id,
            user=user.id,
            application=devguide_app.id,
            organization=user.default_project_id)

    # Make user0 Global Manager

    keystone.fiware_roles.roles.add_to_user(
        role=global_manager.id,
        user=users[0].id,
        application=devguide_app.id,
        organization=users[0].default_project_id)

    keystone.fiware_roles.roles.add_to_user(
        role=franchise_manager.id,
        user=users[1].id,
        application=devguide_app.id,
        organization=franchises[0].id)

    keystone.fiware_roles.roles.add_to_user(
        role=franchise_manager.id,
        user=users[2].id,
        application=devguide_app.id,
        organization=franchises[1].id)

    keystone.fiware_roles.roles.add_to_user(
        role=franchise_manager.id,
        user=users[3].id,
        application=devguide_app.id,
        organization=franchises[2].id)

    keystone.fiware_roles.roles.add_to_user(
        role=franchise_manager.id,
        user=users[4].id,
        application=devguide_app.id,
        organization=franchises[3].id)

    for i in range(4):
        keystone.roles.grant(user=users[i+1].id,
            role=owner_role.id,
            project=franchises[i].id)


    # Make user1-4 Frnanchise Manager

    # Adding permissions for manager and restaurants (TODO)

    perm0 = keystone.fiware_roles.permissions.create(
                name='reservations', 
                application=devguide_app, 
                action= 'POST', 
                resource= 'NGSI10/queryContext?limit=1000&entity_type=reservation',
                is_internal=False)

    keystone.fiware_roles.permissions.add_to_role(
                    global_manager, perm0)

    perm1 = keystone.fiware_roles.permissions.create(
                name='reviews', 
                application=devguide_app, 
                action= 'POST', 
                resource= 'NGSI10/queryContext?limit=1000&entity_type=review',
                is_internal=False)

    keystone.fiware_roles.permissions.add_to_role(
                    global_manager, perm1)

    perm2 = keystone.fiware_roles.permissions.create(
                name='restaurants', 
                application=devguide_app, 
                action= 'POST', 
                resource= 'NGSI10/queryContext?limit=1000&entity_type=restaurant',
                is_internal=False)

    keystone.fiware_roles.permissions.add_to_role(
                    global_manager, perm2)

    keystone.fiware_roles.permissions.add_to_role(
                    global_manager, perm2)
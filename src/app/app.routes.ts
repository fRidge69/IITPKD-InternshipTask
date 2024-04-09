import { Routes } from '@angular/router';
import { PeopleComponent } from './page/people/people.component';
import { PeopleinfoComponent } from './page/peopleinfo/peopleinfo.component';
import { HomeComponent } from './page/home/home.component';
import { UploadComponent } from './page/upload/upload.component';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    {path: 'home', component: HomeComponent},
    {path: 'home/people', component: PeopleComponent},
    {path: 'home/people/peopleinfo', component: PeopleinfoComponent},
    {path: 'home/people/peopleinfo/upload', component: UploadComponent}
];

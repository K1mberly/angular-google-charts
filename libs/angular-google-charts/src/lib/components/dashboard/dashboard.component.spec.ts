import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EMPTY, of, Subject } from 'rxjs';

import { ScriptLoaderService } from '../../script-loader/script-loader.service';

import { DashboardComponent } from './dashboard.component';

jest.mock('../../script-loader/script-loader.service');

const visualizationMock = {
  Dashboard: jest.fn(),
  arrayToDataTable: jest.fn(),
  events: {
    addListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      providers: [ScriptLoaderService]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    // No change detection here, we want to invoke the
    // lifecycle methods in the unit tests
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load the controls package', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(EMPTY);

      component.ngOnInit();

      expect(scriptLoaderService.loadChartPackages).toHaveBeenCalledWith('controls');
    });

    it('should create the data table', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      globalThis.google = { visualization: visualizationMock } as any;

      const columns = ['test', 'test2'];
      component.columns = columns;

      const data = [
        ['row 1', 10],
        ['row 2', 12]
      ];
      component.data = data;

      component['controlWrappers'] = [] as any;

      component.ngOnInit();

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalledWith([columns, ...data], false);
    });

    it('should create the data table without columns if none are provided', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      globalThis.google = { visualization: visualizationMock } as any;
      const data = [
        ['row 1', 10],
        ['row 2', 12]
      ];
      component.data = data;

      component['controlWrappers'] = [] as any;

      component.ngOnInit();

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalledWith(data, true);
    });

    it('should wait for all controls and their charts until creating the dashboard', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      globalThis.google = { visualization: visualizationMock } as any;

      const chartOne = { wrapperReady$: new Subject() };
      const chartTwo = { wrapperReady$: new Subject() };
      const controlOne = { wrapperReady$: new Subject(), for: chartOne };
      const controlTwo = { wrapperReady$: new Subject(), for: [chartOne, chartTwo] };

      component['controlWrappers'] = [controlOne, controlTwo] as any;

      component.ngOnInit();

      expect(visualizationMock.Dashboard).not.toHaveBeenCalled();

      controlOne.wrapperReady$.next();
      controlTwo.wrapperReady$.next();
      expect(visualizationMock.Dashboard).not.toHaveBeenCalled();

      chartOne.wrapperReady$.next();
      expect(visualizationMock.Dashboard).not.toHaveBeenCalled();
      chartTwo.wrapperReady$.next();

      expect(visualizationMock.Dashboard).toHaveBeenCalled();
    });

    it('should bind all controls and dashboards', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      globalThis.google = { visualization: visualizationMock } as any;

      const chartOne = { wrapperReady$: of(null), chartWrapper: {} };
      const chartTwo = { wrapperReady$: of(null), chartWrapper: {} };
      const controlOne = { wrapperReady$: of(null), for: chartOne, controlWrapper: {} };
      const controlTwo = { wrapperReady$: of(null), for: [chartOne, chartTwo], controlWrapper: {} };

      component['controlWrappers'] = [controlOne, controlTwo] as any;

      component.ngOnInit();

      expect(dashboardMock.bind).toHaveBeenCalledWith(controlOne.controlWrapper, chartOne.chartWrapper);
      expect(dashboardMock.bind).toHaveBeenCalledWith(controlTwo.controlWrapper, [chartOne.chartWrapper, chartTwo.chartWrapper]);
    });

    it('should draw the dashboard using the provided data', () => {
      const scriptLoaderService = TestBed.inject(ScriptLoaderService) as jest.Mocked<ScriptLoaderService>;
      scriptLoaderService.loadChartPackages.mockReturnValueOnce(of(null));

      const dashboardMock = { bind: jest.fn(), draw: jest.fn() };
      visualizationMock.Dashboard.mockReturnValueOnce(dashboardMock);

      const dataTableMock = {};
      visualizationMock.arrayToDataTable.mockReturnValueOnce(dataTableMock);

      globalThis.google = { visualization: visualizationMock } as any;

      // At least one control wrapper is needed to start the drawing
      const chart = { wrapperReady$: of(null), chartWrapper: {} };
      const control = { wrapperReady$: of(null), for: chart, controlWrapper: {} };
      component['controlWrappers'] = [control] as any;

      component.data = [];

      component.ngOnInit();

      expect(dashboardMock.draw).toHaveBeenCalledWith(dataTableMock);
    });
  });

  describe('ngOnChanges', () => {
    function changeInput<K extends keyof DashboardComponent>(property: K, newValue: DashboardComponent[K]) {
      const oldValue = component[property];
      component[property] = newValue;
      component.ngOnChanges({ [property]: new SimpleChange(oldValue, newValue, oldValue == null) });
    }

    it('should not throw if called before initialization', () => {
      expect(() => component.ngOnChanges({})).not.toThrow();
    });

    it('should redraw the chart if the data changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      const data = [['row 1', 12]];
      changeInput('data', data);

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalled();
      expect(dashboardMock.draw).toHaveBeenCalled();
    });

    it('should redraw the chart if the columns changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      component.data = [];

      const columns = ['test'];
      changeInput('columns', columns);

      expect(visualizationMock.arrayToDataTable).toHaveBeenCalled();
      expect(dashboardMock.draw).toHaveBeenCalled();
    });

    it('should not redraw if nothing changed', () => {
      const dashboardMock = { draw: jest.fn() };
      component['dashboard'] = dashboardMock as any;
      component['initialized'] = true;

      globalThis.google = { visualization: visualizationMock } as any;

      component.data = [['row 1', 12]];
      component.columns = ['test'];

      component.ngOnChanges({});

      expect(visualizationMock.arrayToDataTable).not.toHaveBeenCalled();
      expect(dashboardMock.draw).not.toHaveBeenCalled();
    });
  });
});
